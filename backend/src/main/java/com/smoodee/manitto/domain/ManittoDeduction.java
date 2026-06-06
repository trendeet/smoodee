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
    name = "manitto_deductions",
    indexes = {
      @Index(name = "idx_manitto_deduction_room_guesser", columnList = "roomId,guesserUserId"),
      @Index(name = "idx_manitto_deduction_room_target", columnList = "roomId,guessedTargetUserId")
    })
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ManittoDeduction extends BaseTimeEntity {

  @Column(nullable = false)
  private Long roomId;

  @Column(nullable = false)
  private Long guesserUserId;

  @Column(nullable = false)
  private Long guessedTargetUserId;

  @Column(nullable = false, length = 1000)
  private String reason;

  @Builder
  public ManittoDeduction(
      Long roomId, Long guesserUserId, Long guessedTargetUserId, String reason) {
    this.roomId = roomId;
    this.guesserUserId = guesserUserId;
    this.guessedTargetUserId = guessedTargetUserId;
    this.reason = reason;
  }
}
