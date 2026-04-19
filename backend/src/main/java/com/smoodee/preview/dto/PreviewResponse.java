package com.smoodee.preview.dto;

import java.util.List;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class PreviewResponse {

  private final List<SlotPreview> slots;
  private final List<MemberInfo> members;

  @Getter
  @Builder
  public static class SlotPreview {
    private final Long slotId;
    private final String timeLabel;
    private final int orderIndex;
    private final List<CellInfo> cells;
  }

  @Getter
  @Builder
  public static class CellInfo {
    private final Long userId;
    private final Long assetId;
    private final String downloadUrl; // presigned, nullable if missing
    private final boolean missing;
  }

  @Getter
  @Builder
  public static class MemberInfo {
    private final Long userId;
  }
}
