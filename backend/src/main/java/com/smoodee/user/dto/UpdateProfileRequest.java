package com.smoodee.user.dto;

import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class UpdateProfileRequest {

  @Size(min = 1, max = 50, message = "이름은 1~50자여야 합니다.")
  private String name;

  @Size(max = 200, message = "소개는 200자 이하여야 합니다.")
  private String bio;
}
