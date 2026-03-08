package com.smoodee.chat.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class SendMessageRequest {

  @NotBlank
  @Size(max = 500, message = "메시지는 500자 이하여야 합니다.")
  private String body;
}
