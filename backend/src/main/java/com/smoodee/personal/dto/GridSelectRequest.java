package com.smoodee.personal.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class GridSelectRequest {

  @NotNull private String gridType; // G2 or G3
}
