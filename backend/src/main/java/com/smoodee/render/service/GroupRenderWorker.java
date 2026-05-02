package com.smoodee.render.service;

import com.smoodee.asset.domain.Asset;
import com.smoodee.asset.repository.AssetRepository;
import com.smoodee.group.domain.GroupMember;
import com.smoodee.group.repository.GroupMemberRepository;
import com.smoodee.group.repository.GroupRepository;
import com.smoodee.render.domain.RenderJob;
import com.smoodee.render.repository.RenderJobRepository;
import com.smoodee.slot.domain.Slot;
import com.smoodee.slot.domain.SlotUpload;
import com.smoodee.slot.domain.SlotUploadStatus;
import com.smoodee.slot.repository.SlotRepository;
import com.smoodee.slot.repository.SlotUploadRepository;
import com.smoodee.storage.service.StorageService;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStreamReader;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class GroupRenderWorker {

  // Portrait layout: members stacked vertically → 720×1280 total
  private static final int OUTPUT_WIDTH = 720;
  private static final int OUTPUT_HEIGHT = 1280;
  private static final int SEGMENT_DURATION = 2;
  private static final String PLACEHOLDER_COLOR = "0x1a1a1a";

  private final RenderJobRepository renderJobRepository;
  private final GroupRepository groupRepository;
  private final GroupMemberRepository groupMemberRepository;
  private final SlotRepository slotRepository;
  private final SlotUploadRepository slotUploadRepository;
  private final AssetRepository assetRepository;
  private final StorageService storageService;

  private record CellInfo(boolean isImage, String caption, boolean isMissing) {}

  private record TextOverlay(int inputIdx, String xExpr, String yExpr) {}

  @Async("renderExecutor")
  public void execute(RenderJob job) {
    log.info("GroupRender start: jobId={}", job.getId());
    job.markRunning();
    renderJobRepository.save(job);

    Path tempDir = null;
    try {
      tempDir = Files.createTempDirectory("smoodee-render-" + job.getId());
      checkFfmpeg();

      var group =
          groupRepository
              .findByProjectId(job.getProjectId())
              .orElseThrow(() -> new IllegalStateException("Group not found"));
      Long groupId = group.getId();

      List<GroupMember> members = groupMemberRepository.findByGroupId(groupId);
      List<Long> memberIds =
          members.stream()
              .sorted(Comparator.comparing(GroupMember::getJoinedAt))
              .map(GroupMember::getUserId)
              .collect(Collectors.toList());

      List<Slot> slots = slotRepository.findByGroupIdOrderByOrderIndex(groupId).stream()
          .sorted(Comparator.comparing(slot -> {
            String t = slot.getTimeLabel();
            if (t == null || !t.contains(":")) return 0;
            String[] parts = t.split(":");
            return Integer.parseInt(parts[0]) * 60 + Integer.parseInt(parts[1]);
          }))
          .collect(Collectors.toList());
      List<Long> slotIds = slots.stream().map(Slot::getId).collect(Collectors.toList());

      List<SlotUpload> uploads = slotUploadRepository.findBySlotIdIn(slotIds);
      Map<Long, Map<Long, SlotUpload>> uploadMap =
          uploads.stream()
              .collect(
                  Collectors.groupingBy(
                      SlotUpload::getSlotId, Collectors.toMap(SlotUpload::getUserId, u -> u)));

      List<Path> segmentFiles = new ArrayList<>();
      for (Slot slot : slots) {
        Map<Long, SlotUpload> slotUploads = uploadMap.getOrDefault(slot.getId(), Map.of());
        Path segmentFile = buildSegment(job.getId(), slot, memberIds, slotUploads, tempDir);
        segmentFiles.add(segmentFile);
      }

      Path outputFile = tempDir.resolve("output.mp4");
      concatSegments(segmentFiles, outputFile);

      String s3Key = String.format("renders/%d/%d.mp4", job.getProjectId(), job.getId());
      uploadOutput(outputFile, s3Key);

      job.markSucceeded(s3Key);
      log.info("GroupRender succeeded: jobId={}, key={}", job.getId(), s3Key);
    } catch (Exception e) {
      log.error("GroupRender failed: jobId={}", job.getId(), e);
      job.markFailed(e.getMessage());
    } finally {
      renderJobRepository.save(job);
      cleanTempDir(tempDir);
    }
  }

  /**
   * 슬롯 1개 → MP4 세그먼트 생성
   * 레이아웃:
   *   ≤6명: 세로 1열 vstack
   *   7~8명: 2열 그리드 (hstack 쌍 → vstack)
   */
  private Path buildSegment(
      Long jobId, Slot slot, List<Long> memberIds, Map<Long, SlotUpload> uploads, Path tempDir)
      throws Exception {

    boolean twoColumn = memberIds.size() >= 6;
    int gridRows = twoColumn ? (int) Math.ceil(memberIds.size() / 2.0) : memberIds.size();
    int cellWidth = twoColumn ? OUTPUT_WIDTH / 2 : OUTPUT_WIDTH;
    int cellHeight = OUTPUT_HEIGHT / gridRows;
    // 2열 + 홀수 인원이면 마지막 빈 칸을 채울 phantom 셀 1개 필요
    int phantomCount = (twoColumn && memberIds.size() % 2 == 1) ? 1 : 0;
    int totalCells = memberIds.size() + phantomCount;

    List<String> inputArgs = new ArrayList<>();
    List<String> filterParts = new ArrayList<>();
    List<CellInfo> cellInfos = new ArrayList<>();

    for (int i = 0; i < memberIds.size(); i++) {
      Long memberId = memberIds.get(i);
      SlotUpload upload = uploads.get(memberId);
      boolean isMissing = upload == null || upload.getStatus() == SlotUploadStatus.MISSING;
      String caption =
          (!isMissing
                  && upload.getCaption() != null
                  && !upload.getCaption().isBlank())
              ? upload.getCaption()
              : null;

      if (isMissing) {
        // placeholder: dark background, duration fixed at SEGMENT_DURATION
        inputArgs.add("-f");
        inputArgs.add("lavfi");
        inputArgs.add("-i");
        inputArgs.add(
            String.format(
                "color=%s:size=%dx%d:rate=30:duration=%d",
                PLACEHOLDER_COLOR, cellWidth, cellHeight, SEGMENT_DURATION));
        cellInfos.add(new CellInfo(false, null, true));
      } else {
        Asset asset =
            assetRepository
                .findById(upload.getAssetId())
                .orElseThrow(
                    () -> new IllegalStateException("Asset not found: " + upload.getAssetId()));
        boolean isImage = asset.getMime() != null && asset.getMime().startsWith("image/");
        Path file =
            downloadFile(
                asset.getS3Key(),
                mimeToExt(asset.getMime()),
                tempDir,
                jobId,
                slot.getId(),
                i);
        if (file.toString().endsWith(".heic")) {
          file = convertHeicToJpeg(file, tempDir, jobId, slot.getId(), i);
        }
        if (isImage) {
          inputArgs.add("-loop");
          inputArgs.add("1");
          inputArgs.add("-framerate");
          inputArgs.add("30");
          inputArgs.add("-t");
          inputArgs.add(String.valueOf(SEGMENT_DURATION));
          inputArgs.add("-i");
          inputArgs.add(file.toAbsolutePath().toString());
        } else {
          // pre-trim: 합성 전 3초로 자른 임시 파일 생성
          Path trimmed = tempDir.resolve("trim_" + slot.getId() + "_" + i + ".mp4");
          pretrimVideo(file, trimmed);
          inputArgs.add("-i");
          inputArgs.add(trimmed.toAbsolutePath().toString());
        }
        cellInfos.add(new CellInfo(isImage, caption, false));
      }
    }

    // 2열 홀수 인원: 빈 오른쪽 하단 셀을 검정 placeholder로 채움
    if (phantomCount == 1) {
      inputArgs.add("-f");
      inputArgs.add("lavfi");
      inputArgs.add("-i");
      inputArgs.add(String.format(
          "color=%s:size=%dx%d:rate=30:duration=%d",
          PLACEHOLDER_COLOR, cellWidth, cellHeight, SEGMENT_DURATION));
    }

    // Generate text PNGs and collect overlay info
    ensurePilmoji();
    List<TextOverlay> overlays = new ArrayList<>();
    int pngInputIdx = totalCells;  // PNG 입력은 실제 셀(+phantom) 다음 인덱스부터

    for (int i = 0; i < memberIds.size(); i++) {
      CellInfo info = cellInfos.get(i);
      String text = null;
      int fontSize = 52;
      int strokeWidth = 2;
      if (info.caption() != null) {
        text = info.caption();
      } else if (info.isMissing()) {
        text = "MISSING";
        fontSize = 48;
        strokeWidth = 2;
      }
      if (text != null) {
        Path png = renderTextPng(text, fontSize, tempDir, "caption_" + i, strokeWidth, true);
        inputArgs.add("-i");
        inputArgs.add(png.toAbsolutePath().toString());
        String xExpr, yExpr;
        if (twoColumn) {
          int col = i % 2;
          int row = i / 2;
          xExpr = (col * cellWidth) + "+(" + cellWidth + "-w)/2";
          yExpr = (row * cellHeight) + "+(" + cellHeight + "-h)/2";
        } else {
          xExpr = "(W-w)/2";
          yExpr = (i * cellHeight) + "+(" + cellHeight + "-h)/2";
        }
        overlays.add(new TextOverlay(pngInputIdx++, xExpr, yExpr));
      }
    }

    for (int r = 1; r < gridRows; r++) {
      String timeLabel = slot.getTimeLabel();
      if (timeLabel == null || timeLabel.equals("소개")) continue;
      Path png = renderTextPng(timeLabel, 84, tempDir, "time_" + r, 0, true);
      inputArgs.add("-i");
      inputArgs.add(png.toAbsolutePath().toString());
      int divideY = r * cellHeight;
      overlays.add(new TextOverlay(pngInputIdx++, "(W-w)/2", divideY + "-h/2"));
    }

    // Build per-cell scale filters (real cells + phantom)
    for (int i = 0; i < totalCells; i++) {
      filterParts.add(String.format(
          "[%d:v]fps=30,setpts=PTS-STARTPTS,"
              + "scale=%d:%d:force_original_aspect_ratio=increase,crop=%d:%d,setsar=1[v%d]",
          i, cellWidth, cellHeight, cellWidth, cellHeight, i));
    }

    // Stack cells
    if (twoColumn) {
      // 2열: 각 행을 hstack으로 합친 뒤 vstack
      for (int r = 0; r < gridRows; r++) {
        filterParts.add("[v" + (r * 2) + "][v" + (r * 2 + 1) + "]hstack=inputs=2[row" + r + "]");
      }
      StringBuilder rowInputs = new StringBuilder();
      for (int r = 0; r < gridRows; r++) rowInputs.append("[row").append(r).append("]");
      filterParts.add(rowInputs + "vstack=inputs=" + gridRows + "[hstacked]");
    } else if (memberIds.size() == 1) {
      filterParts.add("[v0]copy[hstacked]");
    } else {
      // 1열: vstack (2명 이상)
      StringBuilder vstackInputs = new StringBuilder();
      for (int i = 0; i < memberIds.size(); i++) vstackInputs.append("[v").append(i).append("]");
      filterParts.add(vstackInputs + "vstack=inputs=" + memberIds.size() + "[hstacked]");
    }

    // Overlay chain: captions + time labels
    String currentLabel = "hstacked";
    for (int i = 0; i < overlays.size(); i++) {
      TextOverlay ov = overlays.get(i);
      String nextLabel = (i == overlays.size() - 1) ? "out" : "ov" + i;
      filterParts.add(String.format("[%s][%d:v]overlay=%s:%s[%s]",
          currentLabel, ov.inputIdx(), ov.xExpr(), ov.yExpr(), nextLabel));
      currentLabel = nextLabel;
    }
    if (overlays.isEmpty()) {
      filterParts.add("[hstacked]copy[out]");
    }

    String filterComplex = String.join(";", filterParts);
    Path segmentFile = tempDir.resolve("segment_" + slot.getId() + ".mp4");

    List<String> cmd = new ArrayList<>();
    cmd.add(FFMPEG);
    cmd.add("-y");
    cmd.addAll(inputArgs);
    cmd.add("-filter_complex");
    cmd.add(filterComplex);
    cmd.add("-map");
    cmd.add("[out]");
    cmd.add("-t");
    cmd.add(String.valueOf(SEGMENT_DURATION));
    cmd.add("-c:v");
    cmd.add("libx264");
    cmd.add("-preset");
    cmd.add("fast");
    cmd.add("-crf");
    cmd.add("23");
    cmd.add(segmentFile.toAbsolutePath().toString());

    runCommand(cmd);
    return segmentFile;
  }

  /** pilmoji로 텍스트(이모지 포함)를 투명 PNG로 렌더링 */
  private Path renderTextPng(String text, int fontSize, Path tempDir, String suffix)
      throws Exception {
    return renderTextPng(text, fontSize, tempDir, suffix, 0);
  }

  private Path renderTextPng(String text, int fontSize, Path tempDir, String suffix, int strokeWidth)
      throws Exception {
    return renderTextPng(text, fontSize, tempDir, suffix, strokeWidth, false);
  }

  private Path renderTextPng(String text, int fontSize, Path tempDir, String suffix,
      int strokeWidth, boolean bold) throws Exception {
    Path script = resolveRenderScript();
    Path output = tempDir.resolve("text_" + suffix + ".png");
    List<String> cmd = new ArrayList<>(List.of(
        "python3", script.toAbsolutePath().toString(),
        text, String.valueOf(fontSize), output.toAbsolutePath().toString()));
    cmd.add(String.valueOf(strokeWidth));
    if (bold) cmd.add("1");
    ProcessBuilder pb = new ProcessBuilder(cmd).redirectErrorStream(true);
    Process process = pb.start();
    String out = new String(process.getInputStream().readAllBytes());
    int code = process.waitFor();
    if (code != 0) {
      throw new IllegalStateException("render_text.py 실패: " + out);
    }
    return output;
  }

  private Path resolveRenderScript() {
    String[] candidates = {
        "scripts/render_text.py",
        "backend/scripts/render_text.py",
    };
    for (String c : candidates) {
      Path p = Path.of(c);
      if (Files.exists(p)) return p;
    }
    throw new IllegalStateException("render_text.py를 찾을 수 없습니다 (scripts/ 디렉토리 확인)");
  }

  /** pilmoji 설치 여부 확인 후 없으면 pip install */
  private static void ensurePilmoji() {
    try {
      ProcessBuilder check = new ProcessBuilder("python3", "-c", "import pilmoji")
          .redirectErrorStream(true);
      if (check.start().waitFor() != 0) {
        log.info("pilmoji 없음 → pip install pilmoji 실행");
        new ProcessBuilder("pip3", "install", "pilmoji")
            .redirectErrorStream(true).start().waitFor();
      }
    } catch (Exception e) {
      log.warn("pilmoji 설치 확인 실패: {}", e.getMessage());
    }
  }

  /** 영상을 SEGMENT_DURATION초로 미리 잘라 새 파일로 저장 (VFR 대응: 프레임 수 기반) */
  private void pretrimVideo(Path input, Path output) throws Exception {
    runCommand(
        List.of(
            FFMPEG, "-y",
            "-i", input.toAbsolutePath().toString(),
            "-vf", "fps=30",
            "-frames:v", String.valueOf(SEGMENT_DURATION * 30),
            "-an",
            "-c:v", "libx264",
            "-preset", "ultrafast",
            "-crf", "23",
            output.toAbsolutePath().toString()));
  }

  private Path downloadFile(
      String s3Key, String ext, Path tempDir, Long jobId, Long slotId, int index)
      throws Exception {
    Path file = tempDir.resolve(String.format("asset_%d_%d_%d%s", jobId, slotId, index, ext));
    try (InputStream is = storageService.getObject(s3Key);
        FileOutputStream fos = new FileOutputStream(file.toFile())) {
      is.transferTo(fos);
    }
    return file;
  }

  private String mimeToExt(String mime) {
    if (mime == null) return ".bin";
    return switch (mime) {
      case "video/mp4" -> ".mp4";
      case "video/quicktime" -> ".mov";
      case "video/webm" -> ".webm";
      case "image/jpeg", "image/jpg" -> ".jpg";
      case "image/png" -> ".png";
      case "image/gif" -> ".gif";
      case "image/webp" -> ".webp";
      case "image/heic", "image/heif", "image/heic-sequence" -> ".heic";
      default -> ".bin";
    };
  }

  private Path convertHeicToJpeg(Path heicFile, Path tempDir, long jobId, long slotId, int index)
      throws Exception {
    Path jpegFile = tempDir.resolve(String.format("asset_%d_%d_%d.jpg", jobId, slotId, index));
    List<String> cmd = List.of(
        "python3", "-c",
        "import pillow_heif; pillow_heif.register_heif_opener(); "
            + "from PIL import Image; "
            + "img = Image.open('" + heicFile.toAbsolutePath() + "'); "
            + "img.save('" + jpegFile.toAbsolutePath() + "', 'JPEG')"
    );
    ProcessBuilder pb = new ProcessBuilder(cmd).redirectErrorStream(true);
    Process process = pb.start();
    String out = new String(process.getInputStream().readAllBytes());
    int code = process.waitFor();
    if (code != 0) {
      throw new IllegalStateException("HEIC→JPEG 변환 실패: " + out);
    }
    return jpegFile;
  }

  private static final String FFMPEG =
      java.nio.file.Files.exists(java.nio.file.Path.of("/opt/homebrew/bin/ffmpeg"))
          ? "/opt/homebrew/bin/ffmpeg"
          : "ffmpeg";

  private void checkFfmpeg() throws Exception {
    Process process = new ProcessBuilder(FFMPEG, "-version").redirectErrorStream(true).start();
    int exitCode = process.waitFor();
    if (exitCode != 0) {
      throw new IllegalStateException("ffmpeg를 찾을 수 없습니다. 서버에 ffmpeg를 설치해주세요.");
    }
  }

  private void concatSegments(List<Path> segmentFiles, Path outputFile) throws Exception {
    if (segmentFiles.size() == 1) {
      Files.copy(segmentFiles.get(0), outputFile);
      return;
    }

    Path listFile = outputFile.getParent().resolve("concat_list.txt");
    StringBuilder sb = new StringBuilder();
    for (Path seg : segmentFiles) {
      sb.append("file '").append(seg.toAbsolutePath()).append("'\n");
    }
    Files.writeString(listFile, sb.toString());

    List<String> cmd =
        List.of(
            FFMPEG,
            "-y",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            listFile.toAbsolutePath().toString(),
            "-c:v",
            "libx264",
            "-preset",
            "fast",
            "-crf",
            "23",
            outputFile.toAbsolutePath().toString());
    runCommand(cmd);
  }

  private void runCommand(List<String> cmd) throws Exception {
    log.debug("FFmpeg command: {}", String.join(" ", cmd));
    ProcessBuilder pb = new ProcessBuilder(cmd).redirectErrorStream(true);
    Process process = pb.start();

    StringBuilder output = new StringBuilder();
    Thread reader = new Thread(() -> {
      try (BufferedReader br = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
        String line;
        while ((line = br.readLine()) != null) {
          output.append(line).append("\n");
        }
      } catch (Exception ignored) {}
    });
    reader.setDaemon(true);
    reader.start();

    boolean finished = process.waitFor(5, TimeUnit.MINUTES);
    if (!finished) {
      process.destroyForcibly();
      throw new IllegalStateException("FFmpeg timeout (5분 초과)");
    }
    reader.join(1000);

    int exitCode = process.exitValue();
    if (exitCode != 0) {
      String out = output.toString();
      log.error("FFmpeg failed (exit={}): {}", exitCode, out);
      throw new IllegalStateException(
          "FFmpeg 처리 실패: " + out.substring(Math.max(0, out.length() - 500)));
    }
  }

  private void uploadOutput(Path outputFile, String s3Key) throws Exception {
    byte[] bytes = Files.readAllBytes(outputFile);
    storageService.put(new java.io.ByteArrayInputStream(bytes), s3Key, "video/mp4", bytes.length);
  }

  private void cleanTempDir(Path tempDir) {
    if (tempDir == null) {
      return;
    }
    try {
      Files.walk(tempDir).sorted(Comparator.reverseOrder()).map(Path::toFile).forEach(File::delete);
    } catch (Exception e) {
      log.warn("Failed to clean temp dir: {}", tempDir, e);
    }
  }
}
