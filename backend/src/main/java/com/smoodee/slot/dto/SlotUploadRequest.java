package com.smoodee.slot.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class SlotUploadRequest {

  @NotNull private Long assetId;
}
