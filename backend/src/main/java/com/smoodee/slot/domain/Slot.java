package com.smoodee.slot.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
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
    name = "slots",
    indexes = {@Index(name = "idx_slot_group_id_order", columnList = "groupId, orderIndex")})
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Slot {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false)
  private Long groupId;

  @Column(nullable = false, length = 50)
  private String timeLabel;

  private LocalDateTime dueAt;

  @Column(nullable = false)
  private int orderIndex;

  @Builder
  public Slot(Long groupId, String timeLabel, LocalDateTime dueAt, int orderIndex) {
    this.groupId = groupId;
    this.timeLabel = timeLabel;
    this.dueAt = dueAt;
    this.orderIndex = orderIndex;
  }

  public void update(String timeLabel, LocalDateTime dueAt) {
    if (timeLabel != null) {
      this.timeLabel = timeLabel;
    }
    if (dueAt != null) {
      this.dueAt = dueAt;
    }
  }

  public void updateOrder(int orderIndex) {
    this.orderIndex = orderIndex;
  }
}
