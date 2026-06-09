package com.smoodee.manitto.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Builder
@Getter
@AllArgsConstructor
public class ManittoCertPostResponse {

  private Long id;
  private String manittiName;
  private String imageUrl;
  private String comment;
  private String createdAt;
  private long likeCount;
  private boolean liked;
}
