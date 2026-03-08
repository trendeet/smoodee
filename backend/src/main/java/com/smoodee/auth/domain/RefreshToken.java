package com.smoodee.auth.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(
    name = "refresh_tokens",
    indexes = {@Index(name = "idx_refresh_token_user_id", columnList = "userId")})
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RefreshToken {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false)
  private Long userId;

  @Column(nullable = false, length = 255)
  private String tokenHash;

  @Column(nullable = false)
  private LocalDateTime expiresAt;

  private LocalDateTime revokedAt;

  @Column(nullable = false)
  private LocalDateTime createdAt;

  private LocalDateTime lastUsedAt;

  @Builder
  public RefreshToken(Long userId, String tokenHash, LocalDateTime expiresAt) {
    this.userId = userId;
    this.tokenHash = tokenHash;
    this.expiresAt = expiresAt;
    this.createdAt = LocalDateTime.now();
  }

  public boolean isRevoked() {
    return revokedAt != null;
  }

  public boolean isExpired() {
    return expiresAt.isBefore(LocalDateTime.now());
  }

  public boolean isValid() {
    return !isRevoked() && !isExpired();
  }

  public void revoke() {
    this.revokedAt = LocalDateTime.now();
  }

  public void updateLastUsed() {
    this.lastUsedAt = LocalDateTime.now();
  }
}
