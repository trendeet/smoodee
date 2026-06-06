package com.smoodee.manitto.domain;

import com.smoodee.global.entity.BaseTimeEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(
    name = "manitto_rooms",
    indexes = {@Index(name = "idx_manitto_room_code", columnList = "roomCode", unique = true)})
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ManittoRoom extends BaseTimeEntity {

  @Column(nullable = false, unique = true, length = 6)
  private String roomCode;

  @Column(length = 100)
  private String roomName;

  @Column(nullable = false)
  private Long hostUserId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private ManittoRoomStatus status = ManittoRoomStatus.SETUP;

  @Column(nullable = false)
  private LocalDateTime endDate;

  @Builder
  private ManittoRoom(String roomCode, String roomName, Long hostUserId, LocalDateTime endDate) {
    this.roomCode = roomCode;
    this.roomName = roomName;
    this.hostUserId = hostUserId;
    this.status = ManittoRoomStatus.SETUP;
    this.endDate = endDate;
  }

  public static ManittoRoom create(Long hostUserId, String roomName, LocalDateTime endDate) {
    return ManittoRoom.builder()
        .roomCode(generateRoomCode())
        .roomName(roomName)
        .hostUserId(hostUserId)
        .endDate(endDate)
        .build();
  }

  public static String generateRoomCode() {
    return UUID.randomUUID().toString().replace("-", "").substring(0, 6).toUpperCase();
  }

  public void updateStatus(ManittoRoomStatus status) {
    this.status = status;
  }
}
