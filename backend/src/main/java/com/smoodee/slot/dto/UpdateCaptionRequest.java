package com.smoodee.slot.dto;

import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class UpdateCaptionRequest {

  @Size(max = 100)
  private String caption;
}
