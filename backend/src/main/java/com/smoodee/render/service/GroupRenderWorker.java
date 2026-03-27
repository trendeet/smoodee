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
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
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

  private record CellInfo(boolean isImage, String caption) {}

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

      List<Slot> slots = slotRepository.findByGroupIdOrderByOrderIndex(groupId);
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
   * 레이아웃: 멤버 수만큼 열(column)을 가로로 배치 (hstack)
   * 각 열에는 해당 멤버의 영상 + 캡션 텍스트 오버레이
   * 상단 중앙에 시간 레이블 표시
   */
  private Path buildSegment(
      Long jobId, Slot slot, List<Long> memberIds, Map<Long, SlotUpload> uploads, Path tempDir)
      throws Exception {

    int rows = memberIds.size();
    int cellWidth = OUTPUT_WIDTH;
    int cellHeight = OUTPUT_HEIGHT / rows;

    List<String> inputArgs = new ArrayList<>();
    List<String> filterParts = new ArrayList<>();
    List<String> stackInputs = new ArrayList<>();
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
        cellInfos.add(new CellInfo(false, null));
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
        cellInfos.add(new CellInfo(isImage, caption));
      }
    }

    // Build per-cell filters
    for (int i = 0; i < memberIds.size(); i++) {
      CellInfo info = cellInfos.get(i);
      StringBuilder f = new StringBuilder();
      f.append(String.format("[%d:v]", i));

      f.append("fps=30,");

      f.append("setpts=PTS-STARTPTS,");
      f.append(
          String.format(
              "scale=%d:%d:force_original_aspect_ratio=increase,crop=%d:%d,setsar=1",
              cellWidth, cellHeight, cellWidth, cellHeight));

      // caption text centered on cell
      if (info.caption() != null) {
        f.append(
            String.format(
                ",drawtext=text='%s':fontsize=22:fontcolor=white%s"
                    + ":x=(w-text_w)/2:y=(h-text_h)/2"
                    + ":shadowcolor=black@0.8:shadowx=2:shadowy=2"
                    + ":box=1:boxcolor=black@0.35:boxborderw=8",
                escapeFfmpegText(info.caption()), fontfileArg()));
      } else if (cellInfos.get(i).isImage() == false && uploads.get(memberIds.get(i)) == null) {
        // missing placeholder label
        f.append(String.format(",drawtext=text='MISSING':fontsize=30:fontcolor=white@0.5%s"
            + ":x=(w-text_w)/2:y=(h-text_h)/2", fontfileArg()));
      }

      f.append("[v").append(i).append("]");
      filterParts.add(f.toString());
      stackInputs.add("[v" + i + "]");
    }

    // vstack: members stacked vertically
    filterParts.add(String.join("", stackInputs) + "vstack=inputs=" + rows + "[hstacked]");

    // time label centered on the full composite frame
    filterParts.add(
        String.format(
            "[hstacked]drawtext=text='%s':fontsize=38:fontcolor=white%s"
                + ":x=(w-text_w)/2:y=(h-text_h)/2"
                + ":shadowcolor=black@0.85:shadowx=2:shadowy=2[out]",
            escapeFfmpegText(slot.getTimeLabel()), fontfileArg()));

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
      default -> ".bin";
    };
  }

  /** FFmpeg drawtext에서 특수문자 이스케이프 */
  private String escapeFfmpegText(String text) {
    return text
        .replace("\\", "\\\\")
        .replace("'", "\u2019") // 작은따옴표 → 유니코드 right single quotation mark
        .replace(":", "\\:")
        .replace("%", "\\%")
        .replace("\n", " ")
        .replace("\r", "");
  }

  private static final String FFMPEG =
      java.nio.file.Files.exists(java.nio.file.Path.of("/opt/homebrew/bin/ffmpeg"))
          ? "/opt/homebrew/bin/ffmpeg"
          : "ffmpeg";

  // 한글 지원 폰트 경로 (macOS → Linux 순으로 탐색)
  private static final String KOREAN_FONT = resolveKoreanFont();

  private static String resolveKoreanFont() {
    String[] candidates = {
      "/System/Library/Fonts/AppleSDGothicNeo.ttc",           // macOS
      "/System/Library/Fonts/Supplemental/AppleGothic.ttf",   // macOS fallback
      "/usr/share/fonts/truetype/nanum/NanumGothic.ttf",      // Ubuntu (fonts-nanum)
      "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc", // Ubuntu (fonts-noto-cjk)
      "/usr/share/fonts/noto-cjk/NotoSansCJK-Regular.ttc",
    };
    for (String path : candidates) {
      if (java.nio.file.Files.exists(java.nio.file.Path.of(path))) {
        return path;
      }
    }
    return null; // 없으면 fontfile 생략 (영문만 정상 출력)
  }

  private String fontfileArg() {
    return KOREAN_FONT != null ? ":fontfile='" + KOREAN_FONT + "'" : "";
  }

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
    String output = new String(process.getInputStream().readAllBytes());
    int exitCode = process.waitFor();
    if (exitCode != 0) {
      log.error("FFmpeg failed (exit={}): {}", exitCode, output);
      throw new IllegalStateException(
          "FFmpeg 처리 실패: " + output.substring(Math.max(0, output.length() - 500)));
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
