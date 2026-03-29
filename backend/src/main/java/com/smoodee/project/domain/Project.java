package com.smoodee.project.domain;

import com.smoodee.global.entity.BaseTimeEntity;
import com.smoodee.template.domain.TemplateType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(
    name = "projects",
    indexes = {@Index(name = "idx_project_user_id", columnList = "userId")})
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Project extends BaseTimeEntity {

  @Column(nullable = true)
  private Long userId;

  @Column(length = 100)
  private String title;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private ProjectType type;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 30)
  private TemplateType templateType;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private ProjectStatus status;

  private LocalDateTime expiresAt;

  @Builder
  public Project(
      Long userId,
      String title,
      ProjectType type,
      TemplateType templateType,
      ProjectStatus status,
      LocalDateTime expiresAt) {
    this.userId = userId;
    this.title = title;
    this.type = type;
    this.templateType = templateType;
    this.status = status;
    this.expiresAt = expiresAt;
  }

  public void updateTitle(String title) {
    this.title = title;
  }

  public void transitionTo(ProjectStatus newStatus) {
    this.status = newStatus;
  }

  public void markExpired() {
    this.status = ProjectStatus.EXPIRED;
  }
}
