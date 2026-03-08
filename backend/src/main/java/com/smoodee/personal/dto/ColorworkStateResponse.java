package com.smoodee.personal.dto;

import com.smoodee.personal.domain.PersonalColorworkConfig;
import com.smoodee.personal.domain.PersonalFrame;
import java.util.List;
import java.util.stream.Collectors;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ColorworkStateResponse {

  private final Long projectId;
  private final String gridType;
  private final String paletteSeed;
  private final String selectedPaletteJson;
  private final boolean howtoSeen;
  private final List<FrameInfo> frames;

  public static ColorworkStateResponse of(
      PersonalColorworkConfig config, List<PersonalFrame> frames) {
    return ColorworkStateResponse.builder()
        .projectId(config.getProjectId())
        .gridType(config.getGridType() != null ? config.getGridType().name() : null)
        .paletteSeed(config.getPaletteSeed())
        .selectedPaletteJson(config.getSelectedPaletteJson())
        .howtoSeen(config.isHowtoSeen())
        .frames(frames.stream().map(FrameInfo::from).collect(Collectors.toList()))
        .build();
  }

  @Getter
  @Builder
  public static class FrameInfo {
    private final int frameIndex;
    private final Long assetId;

    public static FrameInfo from(PersonalFrame frame) {
      return FrameInfo.builder()
          .frameIndex(frame.getFrameIndex())
          .assetId(frame.getAssetId())
          .build();
    }
  }
}
