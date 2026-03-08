package com.smoodee.personal.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class FrameBindRequest {

  @NotNull private Long assetId;
}
