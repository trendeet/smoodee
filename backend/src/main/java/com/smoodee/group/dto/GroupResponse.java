package com.smoodee.group.dto;

import com.smoodee.group.domain.Group;
import com.smoodee.storage.service.StorageService;
import java.time.Duration;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class GroupResponse {

  private final Long id;
  private final Long projectId;
  private final String name;
  private final int memberCount;
  private final String inviteCode;
  private final String coverImageUrl;

  public static GroupResponse from(Group group) {
    return GroupResponse.builder()
        .id(group.getId())
        .projectId(group.getProjectId())
        .name(group.getName())
        .memberCount(group.getMemberCount())
        .inviteCode(group.getInviteCode())
        .coverImageUrl(null)
        .build();
  }

  public static GroupResponse from(StorageService storageService, Group group) {
    String coverImageUrl = group.getCoverImageS3Key() != null
        ? storageService.presignGet(group.getCoverImageS3Key(), Duration.ofDays(7))
        : null;
    return GroupResponse.builder()
        .id(group.getId())
        .projectId(group.getProjectId())
        .name(group.getName())
        .memberCount(group.getMemberCount())
        .inviteCode(group.getInviteCode())
        .coverImageUrl(coverImageUrl)
        .build();
  }
}
