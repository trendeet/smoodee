package com.smoodee.personal.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(
    name = "personal_frames",
    indexes = {@Index(name = "idx_frame_project_id", columnList = "projectId")})
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PersonalFrame {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false)
  private Long projectId;

  @Column(nullable = false)
  private int frameIndex;

  @Column(nullable = false)
  private Long assetId;

  @Builder
  public PersonalFrame(Long projectId, int frameIndex, Long assetId) {
    this.projectId = projectId;
    this.frameIndex = frameIndex;
    this.assetId = assetId;
  }

  public void updateAsset(Long assetId) {
    this.assetId = assetId;
  }
}
