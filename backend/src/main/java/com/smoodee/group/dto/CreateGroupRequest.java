package com.smoodee.group.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class CreateGroupRequest {

  @NotBlank
  @Size(min = 1, max = 50, message = "그룹 이름은 1~50자여야 합니다.")
  private String name;
}
