package com.smoodee.manitto.dto;

import lombok.Getter;

@Getter
public class SubmitDeductionRequest {

  private Long guessedUserId;

  private String reason;
}
