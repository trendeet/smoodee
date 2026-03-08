package com.smoodee.slot.dto;

import jakarta.validation.constraints.NotNull;
import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class ReorderSlotsRequest {

  @NotNull private List<Long> slotIds;
}
