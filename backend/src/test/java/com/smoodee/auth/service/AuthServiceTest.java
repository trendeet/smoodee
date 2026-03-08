package com.smoodee.auth.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;

import com.smoodee.auth.domain.RefreshToken;
import com.smoodee.auth.repository.RefreshTokenRepository;
import com.smoodee.global.exception.BusinessException;
import com.smoodee.global.exception.ErrorCode;
import com.smoodee.global.security.JwtProvider;
import java.time.LocalDateTime;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

  @InjectMocks private AuthService authService;

  @Mock private RefreshTokenRepository refreshTokenRepository;

  @Mock private JwtProvider jwtProvider;

  @Test
  @DisplayName("유효하지 않은 refresh token으로 rotate 시 예외")
  void rotateWithInvalidToken() {
    given(refreshTokenRepository.findByTokenHashAndRevokedAtIsNull(any()))
        .willReturn(Optional.empty());

    assertThatThrownBy(() -> authService.rotate("invalid-token"))
        .isInstanceOf(BusinessException.class)
        .satisfies(
            ex ->
                assertThat(((BusinessException) ex).getErrorCode())
                    .isEqualTo(ErrorCode.INVALID_REFRESH_TOKEN));
  }

  @Test
  @DisplayName("만료된 refresh token으로 rotate 시 예외")
  void rotateWithExpiredToken() {
    RefreshToken expiredToken =
        RefreshToken.builder()
            .userId(1L)
            .tokenHash("hash")
            .expiresAt(LocalDateTime.now().minusDays(1))
            .build();

    // hash를 직접 세팅
    String rawToken = "test-token";
    // authService의 hashToken을 우회할 수 없으므로 실제 hash 사용
    // 만료된 토큰 시나리오: repo에서 found되지만 isValid() == false
    given(refreshTokenRepository.findByTokenHashAndRevokedAtIsNull(any()))
        .willReturn(Optional.of(expiredToken));

    assertThatThrownBy(() -> authService.rotate(rawToken))
        .isInstanceOf(BusinessException.class)
        .satisfies(
            ex ->
                assertThat(((BusinessException) ex).getErrorCode())
                    .isEqualTo(ErrorCode.REFRESH_TOKEN_EXPIRED));
  }
}
