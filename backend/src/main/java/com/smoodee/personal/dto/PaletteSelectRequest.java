package com.smoodee.personal.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class PaletteSelectRequest {

  @NotBlank private String seed;

  @NotNull private List<String> colors;
}
