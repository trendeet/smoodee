package com.smoodee.group.dto;

import com.smoodee.group.domain.GroupMember;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class GroupMemberResponse {

  private final Long userId;
  private final String role;
  private final LocalDateTime joinedAt;

  public static GroupMemberResponse from(GroupMember member) {
    return GroupMemberResponse.builder()
        .userId(member.getUserId())
        .role(member.getRole().name())
        .joinedAt(member.getJoinedAt())
        .build();
  }
}
