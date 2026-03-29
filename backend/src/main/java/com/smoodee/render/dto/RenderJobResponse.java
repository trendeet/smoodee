package com.smoodee.render.dto;

import com.smoodee.render.domain.RenderJob;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class RenderJobResponse {

  private final Long id;
  private final Long projectId;
  private final String type;
  private final String status;
  private final String resultUrl;
  private final String errorReason;
  private final LocalDateTime createdAt;
  private final LocalDateTime updatedAt;

  public static RenderJobResponse from(RenderJob job) {
    return from(job, null);
  }

  public static RenderJobResponse from(RenderJob job, String resultUrl) {
    return RenderJobResponse.builder()
        .id(job.getId())
        .projectId(job.getProjectId())
        .type(job.getType().name())
        .status(job.getStatus().name())
        .resultUrl(resultUrl)
        .errorReason(job.getErrorReason())
        .createdAt(job.getCreatedAt())
        .updatedAt(job.getUpdatedAt())
        .build();
  }
}
