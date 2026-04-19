package com.smoodee.personal.dto;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class PaletteShuffleResponse {

  /** 3개의 팔레트 옵션. 각각 seed + hex 색상 목록. */
  private final List<PaletteEntry> palettes;

  @Getter
  @AllArgsConstructor
  public static class PaletteEntry {
    private final String seed;
    private final List<String> colors; // hex color strings
  }
}
