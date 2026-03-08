package com.smoodee.auth.repository;

import com.smoodee.auth.domain.RefreshToken;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {

  Optional<RefreshToken> findByTokenHashAndRevokedAtIsNull(String tokenHash);

  @Modifying
  @Query(
      "UPDATE RefreshToken rt SET rt.revokedAt = CURRENT_TIMESTAMP WHERE rt.userId = :userId AND rt.revokedAt IS NULL")
  void revokeAllByUserId(Long userId);
}
