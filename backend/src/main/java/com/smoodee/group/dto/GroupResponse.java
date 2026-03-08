package com.smoodee.group.dto;

import com.smoodee.group.domain.Group;
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

  public static GroupResponse from(Group group) {
    return GroupResponse.builder()
        .id(group.getId())
        .projectId(group.getProjectId())
        .name(group.getName())
        .memberCount(group.getMemberCount())
        .inviteCode(group.getInviteCode())
        .build();
  }
}
