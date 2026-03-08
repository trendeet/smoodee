package com.smoodee.slot.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class CreateSlotRequest {

  @NotBlank
  @Size(max = 50)
  private String timeLabel;

  private LocalDateTime dueAt;
}
