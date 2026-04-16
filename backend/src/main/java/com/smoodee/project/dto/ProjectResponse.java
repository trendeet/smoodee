package com.smoodee.project.dto;

import com.smoodee.project.domain.Project;
import java.time.LocalDateTime;
import java.util.List;
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
  private final Long groupId;
  private final Integer memberCount;
  private final Long ownerId;
  private final List<String> frameUrls;

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
        .ownerId(project.getUserId())
        .build();
  }

  public static ProjectResponse from(
      Project project, Long groupId, String groupName, int memberCount, String thumbnailUrl) {
    return ProjectResponse.builder()
        .id(project.getId())
        .title(groupName)
        .type(project.getType().name())
        .templateType(project.getTemplateType().name())
        .status(project.getStatus().name())
        .createdAt(project.getCreatedAt())
        .updatedAt(project.getUpdatedAt())
        .expiresAt(project.getExpiresAt())
        .groupId(groupId)
        .memberCount(memberCount)
        .thumbnailUrl(thumbnailUrl)
        .ownerId(project.getUserId())
        .build();
  }

  public static ProjectResponse from(
      Project project,
      int filledFrames,
      int totalFrames,
      String thumbnailUrl,
      String paletteColor,
      List<String> frameUrls) {
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
        .ownerId(project.getUserId())
        .frameUrls(frameUrls)
        .build();
  }
}
