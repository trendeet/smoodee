package com.smoodee.render.domain;

import com.smoodee.global.entity.BaseTimeEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(
    name = "render_jobs",
    indexes = {@Index(name = "idx_render_job_project_id", columnList = "projectId")})
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RenderJob extends BaseTimeEntity {

  @Column(nullable = false)
  private Long projectId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private RenderJobType type;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private RenderJobStatus status;

  @Column(length = 500)
  private String outputS3Key;

  @Column(columnDefinition = "TEXT")
  private String errorReason;

  @Builder
  public RenderJob(Long projectId, RenderJobType type) {
    this.projectId = projectId;
    this.type = type;
    this.status = RenderJobStatus.QUEUED;
  }

  public void markRunning() {
    this.status = RenderJobStatus.RUNNING;
  }

  public void markSucceeded(String outputS3Key) {
    this.status = RenderJobStatus.SUCCEEDED;
    this.outputS3Key = outputS3Key;
  }

  public void markFailed(String errorReason) {
    this.status = RenderJobStatus.FAILED;
    this.errorReason = errorReason;
  }
}
