package com.smoodee.manitto.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Builder
@Getter
@AllArgsConstructor
public class ManittoParticipantInfo {

  private Long userId;

  private String name;

  private String nickname;

  private String avatarColor;

  private String wallColor;

  private boolean isReady;
}
