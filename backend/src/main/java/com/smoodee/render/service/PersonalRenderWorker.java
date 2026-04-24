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

  private record Cell(int x, int y, int w, int h) {}

  private List<Cell> getCells(GridType gridType) {
    final int gw = OUTPUT_WIDTH - 2 * PADDING; // 1040

    return switch (gridType) {
      case G2 -> {
        // 3 equal cols, 2 equal rows — staggered wide pattern
        // Layout: [wide(0-1)][1] / [2][wide(1-2)]
        int col = (gw - 2 * GRID_GAP) / 3;           // 341
        int colR = gw - 2 * col - 2 * GRID_GAP;      // 342 (last col absorbs rounding)
        int px0 = PADDING;
        int px1 = PADDING + col + GRID_GAP;
        int px2 = PADDING + 2 * (col + GRID_GAP);
        int py0 = PADDING;
        int py1 = PADDING + col + GRID_GAP;
        yield List.of(
            new Cell(px0, py0, col * 2 + GRID_GAP, col),              // s0: wide top-left
            new Cell(px2, py0, colR, col),                              // s1: top-right
            new Cell(px0, py1, col, col),                               // s2: bottom-left
            new Cell(px1, py1, col + GRID_GAP + colR, col)             // s3: wide bottom-right
        );
      }
      case G6 -> {
        // 3 equal cols, 3 equal rows — editorial
        // Layout: [0][1][2] / [big(0-1, rows 1-2)][4] / [big cont.][5]
        int col = (gw - 2 * GRID_GAP) / 3;
        int colR = gw - 2 * col - 2 * GRID_GAP;
        int px0 = PADDING;
        int px1 = PADDING + col + GRID_GAP;
        int px2 = PADDING + 2 * (col + GRID_GAP);
        int py0 = PADDING;
        int py1 = PADDING + col + GRID_GAP;
        int py2 = PADDING + 2 * (col + GRID_GAP);
        yield List.of(
            new Cell(px0, py0, col, col),                                           // s0
            new Cell(px1, py0, col, col),                                           // s1
            new Cell(px2, py0, colR, col),                                          // s2
            new Cell(px0, py1, col * 2 + GRID_GAP, col * 2 + GRID_GAP),           // s3: 2×2 big
            new Cell(px2, py1, colR, col),                                          // s4
            new Cell(px2, py2, colR, col)                                           // s5
        );
      }
      case G3 -> {
        // 4 equal cols, 3 equal rows — staircase wide pattern
        // Row 0: [wide(0-1)][2][3]
        // Row 1: [4][wide(1-2)][5... wait, 4 cols]
        // Actually: [3][wide(1-2)][6]  — per slot numbering below
        int col = (gw - 3 * GRID_GAP) / 4;   // 254 (perfect)
        int px0 = PADDING;
        int px1 = PADDING + (col + GRID_GAP);
        int px2 = PADDING + 2 * (col + GRID_GAP);
        int px3 = PADDING + 3 * (col + GRID_GAP);
        int py0 = PADDING;
        int py1 = PADDING + (col + GRID_GAP);
        int py2 = PADDING + 2 * (col + GRID_GAP);
        int wide = col * 2 + GRID_GAP;
        yield List.of(
            new Cell(px0, py0, wide, col),   // s0: wide (cols 0-1)
            new Cell(px2, py0, col, col),    // s1
            new Cell(px3, py0, col, col),    // s2
            new Cell(px0, py1, col, col),    // s3
            new Cell(px1, py1, wide, col),   // s4: wide (cols 1-2)
            new Cell(px3, py1, col, col),    // s5
            new Cell(px0, py2, col, col),    // s6
            new Cell(px1, py2, col, col),    // s7
            new Cell(px2, py2, wide, col)    // s8: wide (cols 2-3)
        );
      }
    };
  }

  private BufferedImage compose(List<BufferedImage> images, GridType gridType, String paletteJson) {
    List<Cell> cells = getCells(gridType);

    int maxBottom = cells.stream().mapToInt(c -> c.y() + c.h()).max().orElse(OUTPUT_WIDTH);
    int outputHeight = maxBottom + PADDING;

    BufferedImage output =
        new BufferedImage(OUTPUT_WIDTH, outputHeight, BufferedImage.TYPE_INT_RGB);
    Graphics2D g = output.createGraphics();
    g.setRenderingHint(
        RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
    g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);

    g.setColor(extractFirstColor(paletteJson));
    g.fillRect(0, 0, OUTPUT_WIDTH, outputHeight);

    for (int i = 0; i < images.size() && i < cells.size(); i++) {
      Cell cell = cells.get(i);
      BufferedImage cropped = centerCrop(images.get(i), cell.w(), cell.h());
      g.drawImage(cropped, cell.x(), cell.y(), cell.w(), cell.h(), null);
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
