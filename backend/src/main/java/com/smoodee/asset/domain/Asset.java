package com.smoodee.asset.domain;

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
    name = "assets",
    indexes = {@Index(name = "idx_asset_project_id", columnList = "projectId")})
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Asset extends BaseTimeEntity {

  @Column(nullable = false)
  private Long projectId;

  @Column(nullable = true)
  private Long ownerUserId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 10)
  private AssetType type;

  @Column(length = 500)
  private String s3Key;

  @Column(length = 100)
  private String mime;

  private Long sizeBytes;

  private Integer width;

  private Integer height;

  private Integer durationSec;

  @Builder
  public Asset(Long projectId, Long ownerUserId, AssetType type, String mime, Long sizeBytes) {
    this.projectId = projectId;
    this.ownerUserId = ownerUserId;
    this.type = type;
    this.mime = mime;
    this.sizeBytes = sizeBytes;
  }

  public void updateS3Key(String s3Key) {
    this.s3Key = s3Key;
  }

  public void updateDimensions(int width, int height) {
    this.width = width;
    this.height = height;
  }
}
