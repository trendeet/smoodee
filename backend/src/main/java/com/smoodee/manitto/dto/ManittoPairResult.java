package com.smoodee.manitto.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Builder
@Getter
@AllArgsConstructor
public class ManittoPairResult {

  private String manittoName;
  private String manittiName;
  private String manittoAvatarColor;
  private String manittiAvatarColor;
  private int itemCount;
  private int visitCount;
}
