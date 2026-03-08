package com.smoodee.slot.dto;

import com.smoodee.slot.domain.Slot;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class SlotResponse {

  private final Long id;
  private final String timeLabel;
  private final LocalDateTime dueAt;
  private final int orderIndex;

  public static SlotResponse from(Slot slot) {
    return SlotResponse.builder()
        .id(slot.getId())
        .timeLabel(slot.getTimeLabel())
        .dueAt(slot.getDueAt())
        .orderIndex(slot.getOrderIndex())
        .build();
  }
}
