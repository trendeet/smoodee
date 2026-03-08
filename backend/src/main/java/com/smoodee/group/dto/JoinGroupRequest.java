package com.smoodee.group.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class JoinGroupRequest {

  @NotBlank private String inviteCode;
}
