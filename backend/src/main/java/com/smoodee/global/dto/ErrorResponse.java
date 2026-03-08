package com.smoodee.global.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.smoodee.global.exception.ErrorCode;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class ErrorResponse {

  private final ErrorDetail error;

  public static ErrorResponse of(ErrorCode errorCode) {
    return new ErrorResponse(new ErrorDetail(errorCode.name(), errorCode.getMessage(), null));
  }

  public static ErrorResponse of(ErrorCode errorCode, Object details) {
    return new ErrorResponse(new ErrorDetail(errorCode.name(), errorCode.getMessage(), details));
  }

  public static ErrorResponse of(String code, String message) {
    return new ErrorResponse(new ErrorDetail(code, message, null));
  }

  @Getter
  @AllArgsConstructor(access = AccessLevel.PRIVATE)
  public static class ErrorDetail {
    private final String code;
    private final String message;

    @JsonInclude(JsonInclude.Include.NON_NULL)
    private final Object details;
  }
}
