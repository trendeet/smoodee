package com.smoodee.group.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
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

  @Min(value = 2, message = "최소 2명이어야 합니다.")
  @Max(value = 20, message = "최대 20명까지 가능합니다.")
  private int memberCount;
}
