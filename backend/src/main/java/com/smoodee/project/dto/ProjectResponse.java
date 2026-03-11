package com.smoodee.project.dto;

import com.smoodee.project.domain.Project;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ProjectResponse {

  private final Long id;
  private final String title;
  private final String type;
  private final String templateType;
  private final String status;
  private final LocalDateTime createdAt;
  private final LocalDateTime updatedAt;
  private final LocalDateTime expiresAt;
  private final Integer filledFrames;
  private final Integer totalFrames;
  private final String thumbnailUrl;
  private final String paletteColor;

  public static ProjectResponse from(Project project) {
    return ProjectResponse.builder()
        .id(project.getId())
        .title(project.getTitle())
        .type(project.getType().name())
        .templateType(project.getTemplateType().name())
        .status(project.getStatus().name())
        .createdAt(project.getCreatedAt())
        .updatedAt(project.getUpdatedAt())
        .expiresAt(project.getExpiresAt())
        .build();
  }

  public static ProjectResponse from(Project project, int filledFrames, int totalFrames, String thumbnailUrl, String paletteColor) {
    return ProjectResponse.builder()
        .id(project.getId())
        .title(project.getTitle())
        .type(project.getType().name())
        .templateType(project.getTemplateType().name())
        .status(project.getStatus().name())
        .createdAt(project.getCreatedAt())
        .updatedAt(project.getUpdatedAt())
        .expiresAt(project.getExpiresAt())
        .filledFrames(filledFrames)
        .totalFrames(totalFrames)
        .thumbnailUrl(thumbnailUrl)
        .paletteColor(paletteColor)
        .build();
  }
}
