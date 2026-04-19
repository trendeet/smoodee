package com.smoodee.auth.service;

import com.smoodee.auth.domain.RefreshToken;
import com.smoodee.auth.repository.RefreshTokenRepository;
import com.smoodee.global.exception.BusinessException;
import com.smoodee.global.exception.ErrorCode;
import com.smoodee.global.security.JwtProvider;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

  private final RefreshTokenRepository refreshTokenRepository;
  private final JwtProvider jwtProvider;

  @Value("${app.jwt.refresh-token-expiry-ms}")
  private long refreshTokenExpiryMs;

  public record RotateResult(String newAccessToken, String newRefreshToken) {}

  @Transactional
  public String createAndSaveRefreshToken(Long userId) {
    String rawToken = UUID.randomUUID().toString();
    String tokenHash = hashToken(rawToken);
    LocalDateTime expiresAt = LocalDateTime.now().plusSeconds(refreshTokenExpiryMs / 1000);
    RefreshToken refreshToken =
        RefreshToken.builder().userId(userId).tokenHash(tokenHash).expiresAt(expiresAt).build();
    refreshTokenRepository.save(refreshToken);
    return rawToken;
  }

  @Transactional
  public RotateResult rotate(String rawRefreshToken) {
    String tokenHash = hashToken(rawRefreshToken);
    RefreshToken refreshToken =
        refreshTokenRepository
            .findByTokenHashAndRevokedAtIsNull(tokenHash)
            .orElseThrow(() -> new BusinessException(ErrorCode.INVALID_REFRESH_TOKEN));
    if (!refreshToken.isValid()) {
      throw new BusinessException(ErrorCode.REFRESH_TOKEN_EXPIRED);
    }
    refreshToken.revoke();
    Long userId = refreshToken.getUserId();
    String newAccessToken = jwtProvider.generateAccessToken(userId);
    String newRefreshToken = createAndSaveRefreshToken(userId);
    return new RotateResult(newAccessToken, newRefreshToken);
  }

  @Transactional
  public void logout(String rawRefreshToken) {
    String tokenHash = hashToken(rawRefreshToken);
    refreshTokenRepository
        .findByTokenHashAndRevokedAtIsNull(tokenHash)
        .ifPresent(RefreshToken::revoke);
  }

  @Transactional
  public void revokeAllByUserId(Long userId) {
    refreshTokenRepository.revokeAllByUserId(userId);
  }

  private String hashToken(String rawToken) {
    try {
      MessageDigest digest = MessageDigest.getInstance("SHA-256");
      byte[] hash = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
      return Base64.getEncoder().encodeToString(hash);
    } catch (Exception e) {
      throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR);
    }
  }
}
