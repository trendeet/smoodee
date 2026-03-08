package com.smoodee.personal.dto;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class PaletteShuffleResponse {

  private final String seed;
  private final List<String> colors; // hex color strings
}
