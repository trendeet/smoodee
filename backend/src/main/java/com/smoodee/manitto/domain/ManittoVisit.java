package com.smoodee.manitto.domain;

import com.smoodee.global.entity.BaseTimeEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(
    name = "manitto_visits",
    indexes = {
      @Index(name = "idx_manitto_visit_room_target", columnList = "roomId,targetUserId"),
      @Index(name = "idx_manitto_visit_created", columnList = "createdAt")
    })
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ManittoVisit extends BaseTimeEntity {

  @Column(nullable = false)
  private Long roomId;

  @Column(nullable = false)
  private Long visitorUserId;

  @Column(nullable = false)
  private Long targetUserId;

  @Column(nullable = false)
  private int posX;

  @Column(nullable = false)
  private int posY;

  @Builder
  public ManittoVisit(Long roomId, Long visitorUserId, Long targetUserId, int posX, int posY) {
    this.roomId = roomId;
    this.visitorUserId = visitorUserId;
    this.targetUserId = targetUserId;
    this.posX = posX;
    this.posY = posY;
  }
}
