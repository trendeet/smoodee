package com.smoodee.slot.service;

import com.smoodee.asset.domain.Asset;
import com.smoodee.asset.service.AssetService;
import com.smoodee.global.exception.ErrorCode;
import com.smoodee.global.exception.NotFoundException;
import com.smoodee.group.domain.GroupMember;
import com.smoodee.group.service.GroupService;
import com.smoodee.project.domain.ProjectStatus;
import com.smoodee.project.service.ProjectService;
import com.smoodee.slot.domain.Slot;
import com.smoodee.slot.domain.SlotUpload;
import com.smoodee.slot.domain.SlotUploadStatus;
import com.smoodee.slot.dto.GroupProgressResponse;
import com.smoodee.slot.dto.SlotResponse;
import com.smoodee.slot.repository.SlotRepository;
import com.smoodee.slot.repository.SlotUploadRepository;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SlotService {

  private final SlotRepository slotRepository;
  private final SlotUploadRepository slotUploadRepository;
  private final GroupService groupService;
  private final ProjectService projectService;
  private final AssetService assetService;

  @Transactional
  public Slot createSlot(Long groupId, Long userId, String timeLabel, LocalDateTime dueAt) {
    groupService.requireMember(groupId, userId);
    int nextOrder = slotRepository.countByGroupId(groupId);
    Slot slot =
        Slot.builder()
            .groupId(groupId)
            .timeLabel(timeLabel)
            .dueAt(dueAt)
            .orderIndex(nextOrder)
            .build();
    return slotRepository.save(slot);
  }

  @Transactional
  public Slot updateSlot(
      Long groupId, Long slotId, Long userId, String timeLabel, LocalDateTime dueAt) {
    groupService.requireMember(groupId, userId);
    Slot slot = getSlot(slotId);
    slot.update(timeLabel, dueAt);
    return slot;
  }

  @Transactional
  public void deleteSlot(Long groupId, Long slotId, Long userId) {
    groupService.requireMember(groupId, userId);
    Slot slot = getSlot(slotId);
    slotRepository.delete(slot);
  }

  @Transactional
  public void reorderSlots(Long groupId, Long userId, List<Long> slotIds) {
    groupService.requireMember(groupId, userId);
    List<Slot> slots = slotRepository.findByGroupIdOrderByOrderIndex(groupId);
    Map<Long, Slot> slotMap = slots.stream().collect(Collectors.toMap(Slot::getId, s -> s));
    for (int i = 0; i < slotIds.size(); i++) {
      Slot slot = slotMap.get(slotIds.get(i));
      if (slot != null) {
        slot.updateOrder(i);
      }
    }
  }

  @Transactional
  public SlotUpload bindUpload(Long groupId, Long slotId, Long userId, Long assetId) {
    groupService.requireMember(groupId, userId);
    getSlot(slotId);
    return slotUploadRepository
        .findBySlotIdAndUserId(slotId, userId)
        .map(
            upload -> {
              upload.updateAsset(assetId);
              return upload;
            })
        .orElseGet(
            () ->
                slotUploadRepository.save(
                    SlotUpload.builder().slotId(slotId).userId(userId).assetId(assetId).build()));
  }

  @Transactional
  public void startGroup(Long groupId, Long userId) {
    groupService.requireOwner(groupId, userId);
    var group = groupService.getGroup(groupId);
    var project = projectService.getProject(group.getProjectId());
    project.transitionTo(ProjectStatus.IN_PROGRESS);
  }

  @Transactional(readOnly = true)
  public GroupProgressResponse getProgress(Long groupId, Long userId) {
    groupService.requireMember(groupId, userId);
    List<GroupMember> members = groupService.getMembers(groupId);
    List<Long> memberIds =
        members.stream().map(GroupMember::getUserId).collect(Collectors.toList());
    List<Slot> slots = slotRepository.findByGroupIdOrderByOrderIndex(groupId);
    List<Long> slotIds = slots.stream().map(Slot::getId).collect(Collectors.toList());
    List<SlotUpload> uploads = slotUploadRepository.findBySlotIdIn(slotIds);

    Map<Long, Set<Long>> uploadedBySlot =
        uploads.stream()
            .filter(u -> u.getStatus() == SlotUploadStatus.UPLOADED)
            .collect(
                Collectors.groupingBy(
                    SlotUpload::getSlotId,
                    Collectors.mapping(SlotUpload::getUserId, Collectors.toSet())));

    Map<Long, Map<Long, String>> matrix = new LinkedHashMap<>();
    for (Slot slot : slots) {
      Map<Long, String> row = new HashMap<>();
      Set<Long> uploadedUsers = uploadedBySlot.getOrDefault(slot.getId(), Set.of());
      for (Long memberId : memberIds) {
        row.put(
            memberId,
            uploadedUsers.contains(memberId)
                ? SlotUploadStatus.UPLOADED.name()
                : SlotUploadStatus.MISSING.name());
      }
      matrix.put(slot.getId(), row);
    }

    List<GroupProgressResponse.SlotInfo> slotInfos =
        slots.stream()
            .map(
                s ->
                    GroupProgressResponse.SlotInfo.builder()
                        .id(s.getId())
                        .timeLabel(s.getTimeLabel())
                        .orderIndex(s.getOrderIndex())
                        .build())
            .collect(Collectors.toList());

    return GroupProgressResponse.builder()
        .slots(slotInfos)
        .memberUserIds(memberIds)
        .matrix(matrix)
        .build();
  }

  @Transactional
  public void updateCaption(Long groupId, Long slotId, Long userId, String caption) {
    groupService.requireMember(groupId, userId);
    slotUploadRepository
        .findBySlotIdAndUserId(slotId, userId)
        .ifPresent(upload -> upload.updateCaption(caption));
  }

  @Transactional
  public void deleteUpload(Long groupId, Long slotId, Long userId) {
    groupService.requireMember(groupId, userId);
    slotUploadRepository
        .findBySlotIdAndUserId(slotId, userId)
        .ifPresent(slotUploadRepository::delete);
  }

  @Transactional(readOnly = true)
  public List<SlotResponse> listSlots(Long groupId, Long userId) {
    List<Slot> slots = slotRepository.findByGroupIdOrderByOrderIndex(groupId);
    List<Long> slotIds = slots.stream().map(Slot::getId).collect(Collectors.toList());
    Map<Long, SlotUpload> uploadBySlotId =
        slotUploadRepository.findBySlotIdInAndUserId(slotIds, userId).stream()
            .collect(Collectors.toMap(SlotUpload::getSlotId, u -> u));

    return slots.stream()
        .map(
            slot -> {
              SlotUpload upload = uploadBySlotId.get(slot.getId());
              if (upload == null) {
                return SlotResponse.from(slot);
              }
              try {
                Asset asset = assetService.getAsset(upload.getAssetId());
                String url = assetService.generateDownloadUrl(upload.getAssetId(), userId);
                return SlotResponse.from(
                    slot, asset.getId(), url, asset.getMime(), upload.getCaption());
              } catch (Exception e) {
                return SlotResponse.from(slot);
              }
            })
        .collect(Collectors.toList());
  }

  private Slot getSlot(Long slotId) {
    return slotRepository
        .findById(slotId)
        .orElseThrow(() -> new NotFoundException(ErrorCode.SLOT_NOT_FOUND));
  }
}
