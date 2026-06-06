package com.smoodee.auth.controller;

import com.smoodee.auth.dto.TokenResponse;
import com.smoodee.auth.service.AuthService;
import com.smoodee.auth.service.OAuthCodeStore;
import com.smoodee.global.dto.ApiResponse;
import com.smoodee.global.exception.BusinessException;
import com.smoodee.global.exception.ErrorCode;
import com.smoodee.global.security.JwtProvider;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Auth", description = "인증 API")
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

  private final AuthService authService;
  private final OAuthCodeStore oAuthCodeStore;
  private final JwtProvider jwtProvider;

  @Value("${app.cookie.secure:true}")
  private boolean cookieSecure;

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

  @Operation(summary = "OAuth 코드 교환", description = "일회용 코드를 Access Token + Refresh 쿠키로 교환합니다.")
  @PostMapping("/exchange")
  public ResponseEntity<ApiResponse<TokenResponse>> exchange(
      @RequestParam String code, HttpServletResponse response) {
    OAuthCodeStore.CodeEntry entry =
        oAuthCodeStore
            .consumeCode(code)
            .orElseThrow(() -> new BusinessException(ErrorCode.INVALID_REFRESH_TOKEN));
    String accessToken = jwtProvider.generateAccessToken(entry.userId());
    setRefreshCookie(response, entry.rawRefreshToken());
    return ResponseEntity.ok(ApiResponse.of(new TokenResponse(accessToken)));
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
            .secure(cookieSecure)
            .sameSite(cookieSecure ? "None" : "Lax")
            .path("/")
            .maxAge(14 * 24 * 60 * 60)
            .build();
    response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
  }

  private void deleteRefreshCookie(HttpServletResponse response) {
    ResponseCookie cookie =
        ResponseCookie.from("refreshToken", "")
            .httpOnly(true)
            .secure(cookieSecure)
            .sameSite(cookieSecure ? "None" : "Lax")
            .path("/")
            .maxAge(0)
            .build();
    response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
  }
}
