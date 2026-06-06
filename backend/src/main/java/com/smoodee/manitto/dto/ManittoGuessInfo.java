package com.smoodee.manitto.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Builder
@Getter
@AllArgsConstructor
public class ManittoGuessInfo {

  private String guesserName;

  private String reason;
}
