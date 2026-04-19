package com.smoodee.global.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.smoodee.global.exception.BusinessException;
import com.smoodee.global.exception.ErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class JwtProviderTest {

  private JwtProvider jwtProvider;
  private static final String SECRET = "test-secret-key-must-be-at-least-32-characters-long";
  private static final long ACCESS_TOKEN_EXPIRY_MS = 900_000L; // 15min

  @BeforeEach
  void setUp() {
    jwtProvider = new JwtProvider(SECRET, ACCESS_TOKEN_EXPIRY_MS);
  }

  @Test
  @DisplayName("정상 토큰 생성 및 userId 추출")
  void generateAndExtractUserId() {
    Long userId = 42L;
    String token = jwtProvider.generateAccessToken(userId);
    assertThat(token).isNotBlank();
    assertThat(jwtProvider.extractUserId(token)).isEqualTo(userId);
  }

  @Test
  @DisplayName("만료된 토큰 검증 시 EXPIRED_TOKEN 예외")
  void expiredToken() {
    JwtProvider shortLivedProvider = new JwtProvider(SECRET, -1L);
    String token = shortLivedProvider.generateAccessToken(1L);
    assertThatThrownBy(() -> jwtProvider.extractUserId(token))
        .isInstanceOf(BusinessException.class)
        .satisfies(
            ex ->
                assertThat(((BusinessException) ex).getErrorCode())
                    .isEqualTo(ErrorCode.EXPIRED_TOKEN));
  }

  @Test
  @DisplayName("위조된 토큰 검증 시 INVALID_TOKEN 예외")
  void tamperedToken() {
    String token = jwtProvider.generateAccessToken(1L);
    String tampered = token.substring(0, token.length() - 5) + "XXXXX";
    assertThatThrownBy(() -> jwtProvider.extractUserId(tampered))
        .isInstanceOf(BusinessException.class)
        .satisfies(
            ex ->
                assertThat(((BusinessException) ex).getErrorCode())
                    .isEqualTo(ErrorCode.INVALID_TOKEN));
  }
}
