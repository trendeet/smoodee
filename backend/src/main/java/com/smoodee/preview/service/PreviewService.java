package com.smoodee.preview.service;

import com.smoodee.asset.domain.Asset;
import com.smoodee.asset.repository.AssetRepository;
import com.smoodee.group.domain.GroupMember;
import com.smoodee.group.service.GroupService;
import com.smoodee.preview.dto.PreviewResponse;
import com.smoodee.slot.domain.Slot;
import com.smoodee.slot.domain.SlotUpload;
import com.smoodee.slot.domain.SlotUploadStatus;
import com.smoodee.slot.repository.SlotRepository;
import com.smoodee.slot.repository.SlotUploadRepository;
import com.smoodee.storage.service.StorageService;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PreviewService {

  private final GroupService groupService;
  private final SlotRepository slotRepository;
  private final SlotUploadRepository slotUploadRepository;
  private final AssetRepository assetRepository;
  private final StorageService storageService;

  @Transactional(readOnly = true)
  public PreviewResponse getPreview(Long groupId, Long userId) {
    groupService.requireMember(groupId, userId);

    List<GroupMember> members = groupService.getMembers(groupId);
    List<Long> memberIds =
        members.stream().map(GroupMember::getUserId).collect(Collectors.toList());

    List<Slot> slots = slotRepository.findByGroupIdOrderByOrderIndex(groupId);
    List<Long> slotIds = slots.stream().map(Slot::getId).collect(Collectors.toList());

    List<SlotUpload> uploads = slotUploadRepository.findBySlotIdIn(slotIds);

    // slotId -> (userId -> SlotUpload)
    Map<Long, Map<Long, SlotUpload>> uploadMap =
        uploads.stream()
            .collect(
                Collectors.groupingBy(
                    SlotUpload::getSlotId, Collectors.toMap(SlotUpload::getUserId, u -> u)));

    // Collect all assetIds to batch-load
    Set<Long> assetIds =
        uploads.stream()
            .filter(u -> u.getStatus() == SlotUploadStatus.UPLOADED)
            .map(SlotUpload::getAssetId)
            .collect(Collectors.toSet());
    Map<Long, Asset> assetMap =
        assetRepository.findAllById(assetIds).stream()
            .collect(Collectors.toMap(Asset::getId, a -> a));

    List<PreviewResponse.SlotPreview> slotPreviews = new ArrayList<>();
    for (Slot slot : slots) {
      Map<Long, SlotUpload> slotUploads = uploadMap.getOrDefault(slot.getId(), Map.of());
      List<PreviewResponse.CellInfo> cells = new ArrayList<>();

      for (Long memberId : memberIds) {
        SlotUpload upload = slotUploads.get(memberId);
        boolean isMissing = upload == null || upload.getStatus() == SlotUploadStatus.MISSING;

        String downloadUrl = null;
        Long assetId = null;
        if (!isMissing) {
          assetId = upload.getAssetId();
          Asset asset = assetMap.get(assetId);
          if (asset != null && asset.getS3Key() != null) {
            downloadUrl = storageService.presignGet(asset.getS3Key(), Duration.ofMinutes(10));
          }
        }

        cells.add(
            PreviewResponse.CellInfo.builder()
                .userId(memberId)
                .assetId(assetId)
                .downloadUrl(downloadUrl)
                .missing(isMissing)
                .build());
      }

      slotPreviews.add(
          PreviewResponse.SlotPreview.builder()
              .slotId(slot.getId())
              .timeLabel(slot.getTimeLabel())
              .orderIndex(slot.getOrderIndex())
              .cells(cells)
              .build());
    }

    List<PreviewResponse.MemberInfo> memberInfos =
        memberIds.stream()
            .map(id -> PreviewResponse.MemberInfo.builder().userId(id).build())
            .collect(Collectors.toList());

    return PreviewResponse.builder().slots(slotPreviews).members(memberInfos).build();
  }
}
