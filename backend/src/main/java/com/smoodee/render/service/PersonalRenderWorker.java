package com.smoodee.render.service;

import com.smoodee.asset.domain.Asset;
import com.smoodee.asset.repository.AssetRepository;
import com.smoodee.personal.domain.GridType;
import com.smoodee.personal.domain.PersonalColorworkConfig;
import com.smoodee.personal.domain.PersonalFrame;
import com.smoodee.personal.repository.PersonalColorworkConfigRepository;
import com.smoodee.personal.repository.PersonalFrameRepository;
import com.smoodee.render.domain.RenderJob;
import com.smoodee.render.repository.RenderJobRepository;
import com.smoodee.storage.service.StorageService;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.Comparator;
import java.util.List;
import javax.imageio.ImageIO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class PersonalRenderWorker {

  private static final int OUTPUT_WIDTH = 1080;
  private static final int PADDING = 20;
  private static final int GRID_GAP = 8;

  private final RenderJobRepository renderJobRepository;
  private final PersonalColorworkConfigRepository configRepository;
  private final PersonalFrameRepository frameRepository;
  private final AssetRepository assetRepository;
  private final StorageService storageService;

  @Async("renderExecutor")
  public void execute(RenderJob job) {
    long t0 = System.currentTimeMillis();
    log.info("PersonalRender start: jobId={}", job.getId());
    job.markRunning();
    renderJobRepository.save(job);

    try {
      PersonalColorworkConfig config =
          configRepository
              .findByProjectId(job.getProjectId())
              .orElseThrow(() -> new IllegalStateException("Config not found"));

      List<PersonalFrame> frames =
          frameRepository.findByProjectIdOrderByFrameIndex(job.getProjectId());

      GridType gridType = config.getGridType();
      int required =
          switch (gridType) {
            case G2 -> 4;
            case G6 -> 6;
            case G3 -> 9;
          };
      if (frames.size() < required) {
        throw new IllegalStateException(
            "프레임 업로드가 완료되지 않았습니다. 필요: " + required + ", 현재: " + frames.size());
      }

      long t1 = System.currentTimeMillis();
      List<BufferedImage> images = loadImages(frames);
      long t2 = System.currentTimeMillis();
      log.info("PersonalRender [S3 download]: jobId={}, {}ms", job.getId(), t2 - t1);

      BufferedImage output = compose(images, gridType, config.getSelectedPaletteJson());
      long t3 = System.currentTimeMillis();
      log.info("PersonalRender [compose]: jobId={}, {}ms", job.getId(), t3 - t2);

      String s3Key = String.format("renders/%d/%d.png", job.getProjectId(), job.getId());
      uploadOutput(output, s3Key);
      long t4 = System.currentTimeMillis();
      log.info("PersonalRender [S3 upload]: jobId={}, {}ms", job.getId(), t4 - t3);

      job.markSucceeded(s3Key);
      log.info("PersonalRender succeeded: jobId={}, total={}ms", job.getId(), t4 - t0);
    } catch (Exception e) {
      log.error(
          "PersonalRender failed: jobId={}, elapsed={}ms",
          job.getId(),
          System.currentTimeMillis() - t0,
          e);
      job.markFailed(e.getMessage());
    } finally {
      renderJobRepository.save(job);
    }
  }

  private List<BufferedImage> loadImages(List<PersonalFrame> frames) {
    return frames.stream()
        .sorted(Comparator.comparingInt(PersonalFrame::getFrameIndex))
        .map(
            frame -> {
              Asset asset =
                  assetRepository
                      .findById(frame.getAssetId())
                      .orElseThrow(
                          () ->
                              new IllegalStateException("Asset not found: " + frame.getAssetId()));
              try (InputStream is = storageService.getObject(asset.getS3Key())) {
                BufferedImage img = ImageIO.read(is);
                if (img == null) {
                  throw new IllegalStateException("이미지를 읽을 수 없습니다: " + asset.getId());
                }
                return img;
              } catch (Exception e) {
                throw new IllegalStateException("이미지 로드 실패: " + e.getMessage());
              }
            })
        .toList();
  }

  private BufferedImage compose(BufferedImage[] images, GridType gridType, String paletteJson) {
    return compose(List.of(images), gridType, paletteJson);
  }

  private BufferedImage compose(List<BufferedImage> images, GridType gridType, String paletteJson) {
    int cols = (gridType == GridType.G2 || gridType == GridType.G6) ? 2 : 3;
    int rows = (gridType == GridType.G6) ? 3 : (gridType == GridType.G2) ? 2 : 3;

    int gridAreaWidth = OUTPUT_WIDTH - 2 * PADDING;
    int cellWidth = (gridAreaWidth - (cols - 1) * GRID_GAP) / cols;
    int cellHeight = cellWidth; // 정사각형 셀
    int gridAreaHeight = rows * cellHeight + (rows - 1) * GRID_GAP;
    int outputHeight = gridAreaHeight + 2 * PADDING;

    BufferedImage output =
        new BufferedImage(OUTPUT_WIDTH, outputHeight, BufferedImage.TYPE_INT_RGB);
    Graphics2D g = output.createGraphics();
    g.setRenderingHint(
        RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
    g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);

    // 배경: 선택한 팔레트 첫 번째 색상 (없으면 흰색)
    g.setColor(extractFirstColor(paletteJson));
    g.fillRect(0, 0, OUTPUT_WIDTH, outputHeight);

    for (int i = 0; i < images.size() && i < cols * rows; i++) {
      int col = i % cols;
      int row = i / cols;
      int x = PADDING + col * (cellWidth + GRID_GAP);
      int y = PADDING + row * (cellHeight + GRID_GAP);

      BufferedImage cell = centerCrop(images.get(i), cellWidth, cellHeight);
      g.drawImage(cell, x, y, cellWidth, cellHeight, null);
    }

    g.dispose();
    return output;
  }

  private BufferedImage centerCrop(BufferedImage src, int targetW, int targetH) {
    double srcRatio = (double) src.getWidth() / src.getHeight();
    double targetRatio = (double) targetW / targetH;

    int cropW, cropH, cropX, cropY;
    if (srcRatio > targetRatio) {
      cropH = src.getHeight();
      cropW = (int) (cropH * targetRatio);
      cropX = (src.getWidth() - cropW) / 2;
      cropY = 0;
    } else {
      cropW = src.getWidth();
      cropH = (int) (cropW / targetRatio);
      cropX = 0;
      cropY = (src.getHeight() - cropH) / 2;
    }

    BufferedImage cropped = src.getSubimage(cropX, cropY, cropW, cropH);
    BufferedImage result = new BufferedImage(targetW, targetH, BufferedImage.TYPE_INT_RGB);
    Graphics2D g = result.createGraphics();
    g.setRenderingHint(
        RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
    g.drawImage(cropped, 0, 0, targetW, targetH, null);
    g.dispose();
    return result;
  }

  private Color extractFirstColor(String paletteJson) {
    if (paletteJson == null || paletteJson.isBlank()) {
      return Color.WHITE;
    }
    try {
      String first = paletteJson.replaceAll("[\\[\\]\"\\s]", "").split(",")[0];
      return Color.decode(first);
    } catch (Exception e) {
      return Color.WHITE;
    }
  }

  private void uploadOutput(BufferedImage image, String s3Key) throws Exception {
    ByteArrayOutputStream baos = new ByteArrayOutputStream();
    ImageIO.write(image, "PNG", baos);
    byte[] bytes = baos.toByteArray();
    storageService.put(new ByteArrayInputStream(bytes), s3Key, "image/png", bytes.length);
  }
}
