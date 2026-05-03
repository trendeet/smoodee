package com.smoodee.auth.controller;

import com.smoodee.auth.dto.TokenResponse;
import com.smoodee.auth.service.AuthService;
import com.smoodee.global.dto.ApiResponse;
import com.smoodee.global.exception.BusinessException;
import com.smoodee.global.exception.ErrorCode;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Auth", description = "인증 API")
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

  private final AuthService authService;

  @Operation(summary = "Access Token 재발급", description = "Refresh 쿠키를 이용해 Access Token을 재발급합니다.")
  @PostMapping("/refresh")
  public ResponseEntity<ApiResponse<TokenResponse>> refresh(
      HttpServletRequest request, HttpServletResponse response) {
    String refreshToken = extractRefreshCookie(request);
    if (refreshToken == null) {
      throw new BusinessException(ErrorCode.INVALID_REFRESH_TOKEN);
    }
    AuthService.RotateResult result = authService.rotate(refreshToken);
    setRefreshCookie(response, result.newRefreshToken());
    return ResponseEntity.ok(ApiResponse.of(new TokenResponse(result.newAccessToken())));
  }

  @Operation(summary = "로그아웃", description = "Refresh 토큰을 폐기하고 쿠키를 삭제합니다.")
  @PostMapping("/logout")
  public ResponseEntity<Void> logout(HttpServletRequest request, HttpServletResponse response) {
    String refreshToken = extractRefreshCookie(request);
    if (refreshToken != null) {
      authService.logout(refreshToken);
    }
    deleteRefreshCookie(response);
    return ResponseEntity.noContent().build();
  }

  private String extractRefreshCookie(HttpServletRequest request) {
    if (request.getCookies() == null) {
      return null;
    }
    for (Cookie cookie : request.getCookies()) {
      if ("refreshToken".equals(cookie.getName())) {
        return cookie.getValue();
      }
    }
    return null;
  }

  private void setRefreshCookie(HttpServletResponse response, String token) {
    ResponseCookie cookie =
        ResponseCookie.from("refreshToken", token)
            .httpOnly(true)
            .secure(true)
            .sameSite("None")
            .path("/")
            .maxAge(14 * 24 * 60 * 60)
            .build();
    response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
  }

  private void deleteRefreshCookie(HttpServletResponse response) {
    ResponseCookie cookie =
        ResponseCookie.from("refreshToken", "")
            .httpOnly(true)
            .secure(true)
            .sameSite("None")
            .path("/")
            .maxAge(0)
            .build();
    response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
  }
}
