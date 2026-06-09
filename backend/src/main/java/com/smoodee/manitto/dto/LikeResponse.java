package com.smoodee.manitto.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class LikeResponse {
  private long likeCount;
  private boolean liked;
}
