package com.smoodee.slot.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(
    name = "slot_uploads",
    uniqueConstraints = {@UniqueConstraint(columnNames = {"slotId", "userId"})},
    indexes = {@Index(name = "idx_slot_upload_slot_id", columnList = "slotId")})
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SlotUpload {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false)
  private Long slotId;

  @Column(nullable = false)
  private Long userId;

  @Column(nullable = false)
  private Long assetId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 10)
  private SlotUploadStatus status;

  @Column(nullable = false)
  private LocalDateTime updatedAt;

  @Column(length = 100)
  private String caption;

  @Builder
  public SlotUpload(Long slotId, Long userId, Long assetId) {
    this.slotId = slotId;
    this.userId = userId;
    this.assetId = assetId;
    this.status = SlotUploadStatus.UPLOADED;
    this.updatedAt = LocalDateTime.now();
  }

  public void updateAsset(Long assetId) {
    this.assetId = assetId;
    this.status = SlotUploadStatus.UPLOADED;
    this.updatedAt = LocalDateTime.now();
  }

  public void updateCaption(String caption) {
    this.caption = caption;
    this.updatedAt = LocalDateTime.now();
  }
}
