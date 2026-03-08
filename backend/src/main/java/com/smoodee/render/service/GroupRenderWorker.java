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

  private static final int OUTPUT_WIDTH = 720;
  private static final int OUTPUT_HEIGHT = 1280;
  private static final int SEGMENT_DURATION = 3;
  private static final String PLACEHOLDER_COLOR = "0x1a1a1a";

  private final RenderJobRepository renderJobRepository;
  private final GroupRepository groupRepository;
  private final GroupMemberRepository groupMemberRepository;
  private final SlotRepository slotRepository;
  private final SlotUploadRepository slotUploadRepository;
  private final AssetRepository assetRepository;
  private final StorageService storageService;

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

  private void checkFfmpeg() throws Exception {
    Process process = new ProcessBuilder("ffmpeg", "-version").redirectErrorStream(true).start();
    int exitCode = process.waitFor();
    if (exitCode != 0) {
      throw new IllegalStateException("ffmpeg를 찾을 수 없습니다. 서버에 ffmpeg를 설치해주세요.");
    }
  }

  private Path buildSegment(
      Long jobId, Slot slot, List<Long> memberIds, Map<Long, SlotUpload> uploads, Path tempDir)
      throws Exception {
    int rows = memberIds.size();
    int cellHeight = OUTPUT_HEIGHT / rows;

    List<String> inputArgs = new ArrayList<>();
    List<String> filterParts = new ArrayList<>();
    List<String> stackInputs = new ArrayList<>();

    for (int i = 0; i < memberIds.size(); i++) {
      Long memberId = memberIds.get(i);
      SlotUpload upload = uploads.get(memberId);
      boolean isMissing = upload == null || upload.getStatus() == SlotUploadStatus.MISSING;

      if (isMissing) {
        // placeholder: color input
        inputArgs.add("-f");
        inputArgs.add("lavfi");
        inputArgs.add("-i");
        inputArgs.add(
            String.format(
                "color=%s:size=%dx%d:rate=30,drawtext=text='MISSING':fontsize=40:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2",
                PLACEHOLDER_COLOR, OUTPUT_WIDTH, cellHeight));
      } else {
        Path videoFile = downloadAsset(upload.getAssetId(), tempDir, jobId, slot.getId(), i);
        inputArgs.add("-i");
        inputArgs.add(videoFile.toAbsolutePath().toString());
      }

      filterParts.add(
          String.format(
              "[%d:v]trim=duration=%d,setpts=PTS-STARTPTS,scale=%d:%d:force_original_aspect_ratio=decrease,"
                  + "pad=%d:%d:(ow-iw)/2:(oh-ih)/2,setsar=1[v%d]",
              i, SEGMENT_DURATION, OUTPUT_WIDTH, cellHeight, OUTPUT_WIDTH, cellHeight, i));
      stackInputs.add("[v" + i + "]");
    }

    String vstack = String.join("", stackInputs) + "vstack=inputs=" + rows + "[out]";
    filterParts.add(vstack);
    String filterComplex = String.join(";", filterParts);

    Path segmentFile = tempDir.resolve("segment_" + slot.getOrderIndex() + ".mp4");

    List<String> cmd = new ArrayList<>();
    cmd.add("ffmpeg");
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

  private Path downloadAsset(Long assetId, Path tempDir, Long jobId, Long slotId, int index)
      throws Exception {
    Asset asset =
        assetRepository
            .findById(assetId)
            .orElseThrow(() -> new IllegalStateException("Asset not found: " + assetId));
    Path file = tempDir.resolve(String.format("asset_%d_%d_%d.mp4", jobId, slotId, index));
    try (InputStream is = storageService.getObject(asset.getS3Key());
        FileOutputStream fos = new FileOutputStream(file.toFile())) {
      is.transferTo(fos);
    }
    return file;
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
            "ffmpeg",
            "-y",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            listFile.toAbsolutePath().toString(),
            "-c",
            "copy",
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
