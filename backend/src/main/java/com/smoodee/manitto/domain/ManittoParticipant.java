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
    name = "manitto_participants",
    indexes = {
      @Index(name = "idx_manitto_participant_room", columnList = "roomId"),
      @Index(
          name = "idx_manitto_participant_room_user",
          columnList = "roomId,userId",
          unique = true)
    })
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ManittoParticipant extends BaseTimeEntity {

  @Column(nullable = false)
  private Long roomId;

  @Column(nullable = false)
  private Long userId;

  @Column(nullable = false, length = 50)
  private String userName;

  @Column(length = 50)
  private String nickname;

  @Column(length = 20)
  private String avatarColor = "#E9967A";

  @Column(length = 20)
  private String wallColor = "#F5E6D3";

  @Column private Long manittoTargetUserId;

  @Column(nullable = false)
  private boolean isReady = true;

  @Builder
  public ManittoParticipant(
      Long roomId,
      Long userId,
      String userName,
      String avatarColor,
      String wallColor,
      Long manittoTargetUserId,
      boolean isReady) {
    this.roomId = roomId;
    this.userId = userId;
    this.userName = userName;
    this.avatarColor = avatarColor != null ? avatarColor : "#E9967A";
    this.wallColor = wallColor != null ? wallColor : "#F5E6D3";
    this.manittoTargetUserId = manittoTargetUserId;
    this.isReady = isReady;
  }

  public void assignTarget(Long targetUserId) {
    this.manittoTargetUserId = targetUserId;
  }

  public void updateNickname(String nickname) {
    this.nickname = nickname;
  }
}
