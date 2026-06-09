package com.smoodee.manitto.domain;

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
    name = "manitto_cert_posts",
    indexes = {
      @Index(name = "idx_cert_post_room", columnList = "roomId"),
      @Index(name = "idx_cert_post_target", columnList = "roomId,targetUserId")
    })
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ManittoCertPost extends BaseTimeEntity {

  @Column(nullable = false)
  private Long roomId;

  @Column(nullable = false)
  private Long itemId;

  @Column(nullable = false)
  private Long fromUserId;

  @Column(nullable = false)
  private Long targetUserId;

  @Column(nullable = false, length = 500)
  private String imageKey;

  @Column(length = 300)
  private String comment;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private CertPostStatus status;

  @Builder
  public ManittoCertPost(
      Long roomId, Long itemId, Long fromUserId, Long targetUserId, String imageKey) {
    this.roomId = roomId;
    this.itemId = itemId;
    this.fromUserId = fromUserId;
    this.targetUserId = targetUserId;
    this.imageKey = imageKey;
    this.status = CertPostStatus.PENDING;
  }

  public void approve(String comment) {
    this.status = CertPostStatus.APPROVED;
    this.comment = comment;
  }

  public void reject() {
    this.status = CertPostStatus.REJECTED;
  }
}
