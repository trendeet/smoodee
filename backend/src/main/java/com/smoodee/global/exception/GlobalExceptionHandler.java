package com.smoodee.global.exception;

import com.smoodee.global.dto.ErrorResponse;
import jakarta.validation.ConstraintViolationException;
import java.util.List;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

  @ExceptionHandler(NotFoundException.class)
  public ResponseEntity<ErrorResponse> handleNotFoundException(NotFoundException e) {
    log.warn("NotFoundException: {}", e.getMessage());
    return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ErrorResponse.of(e.getErrorCode()));
  }

  @ExceptionHandler(ForbiddenException.class)
  public ResponseEntity<ErrorResponse> handleForbiddenException(ForbiddenException e) {
    log.warn("ForbiddenException: {}", e.getMessage());
    return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ErrorResponse.of(e.getErrorCode()));
  }

  @ExceptionHandler(BusinessException.class)
  public ResponseEntity<ErrorResponse> handleBusinessException(BusinessException e) {
    log.warn("BusinessException: {}", e.getMessage());
    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ErrorResponse.of(e.getErrorCode()));
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<ErrorResponse> handleValidationException(
      MethodArgumentNotValidException e) {
    List<String> details =
        e.getBindingResult().getFieldErrors().stream()
            .map(FieldError::getDefaultMessage)
            .collect(Collectors.toList());
    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
        .body(ErrorResponse.of(ErrorCode.INVALID_INPUT, details));
  }

  @ExceptionHandler(ConstraintViolationException.class)
  public ResponseEntity<ErrorResponse> handleConstraintViolation(ConstraintViolationException e) {
    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
        .body(ErrorResponse.of(ErrorCode.INVALID_INPUT, e.getMessage()));
  }

  @ExceptionHandler(AuthenticationException.class)
  public ResponseEntity<ErrorResponse> handleAuthenticationException(AuthenticationException e) {
    log.warn("AuthenticationException: {}", e.getMessage());
    return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
        .body(ErrorResponse.of(ErrorCode.UNAUTHORIZED));
  }

  @ExceptionHandler(AccessDeniedException.class)
  public ResponseEntity<ErrorResponse> handleAccessDeniedException(AccessDeniedException e) {
    return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ErrorResponse.of(ErrorCode.FORBIDDEN));
  }

  @ExceptionHandler(MaxUploadSizeExceededException.class)
  public ResponseEntity<ErrorResponse> handleMaxUploadSizeExceededException(
      MaxUploadSizeExceededException e) {
    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
        .body(ErrorResponse.of(ErrorCode.FILE_TOO_LARGE));
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<ErrorResponse> handleException(Exception e) {
    log.error("Unhandled exception", e);
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
        .body(ErrorResponse.of(ErrorCode.INTERNAL_SERVER_ERROR));
  }
}
