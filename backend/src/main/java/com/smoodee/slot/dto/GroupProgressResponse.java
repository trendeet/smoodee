package com.smoodee.slot.dto;

import java.util.List;
import java.util.Map;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class GroupProgressResponse {

  private final List<SlotInfo> slots;
  private final List<Long> memberUserIds;
  private final Map<Long, Map<Long, String>> matrix; // slotId -> userId -> UPLOADED|MISSING

  @Getter
  @Builder
  public static class SlotInfo {
    private final Long id;
    private final String timeLabel;
    private final int orderIndex;
  }
}
