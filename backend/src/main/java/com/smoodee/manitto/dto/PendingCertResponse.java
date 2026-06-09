package com.smoodee.manitto.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class PendingCertResponse {
  private Long postId;
  private String imageUrl;
}
