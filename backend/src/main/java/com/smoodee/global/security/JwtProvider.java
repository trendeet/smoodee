package com.smoodee.global.security;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.JWSSigner;
import com.nimbusds.jose.JWSVerifier;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jose.crypto.MACVerifier;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import com.smoodee.global.exception.BusinessException;
import com.smoodee.global.exception.ErrorCode;
import java.util.Date;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class JwtProvider {

  private final String secret;
  private final long accessTokenExpiryMs;

  public JwtProvider(
      @Value("${app.jwt.secret}") String secret,
      @Value("${app.jwt.access-token-expiry-ms}") long accessTokenExpiryMs) {
    this.secret = secret;
    this.accessTokenExpiryMs = accessTokenExpiryMs;
  }

  public String generateAccessToken(Long userId) {
    try {
      JWSSigner signer = new MACSigner(secret.getBytes());
      Date now = new Date();
      JWTClaimsSet claims =
          new JWTClaimsSet.Builder()
              .subject(String.valueOf(userId))
              .issueTime(now)
              .expirationTime(new Date(now.getTime() + accessTokenExpiryMs))
              .build();
      SignedJWT signedJWT = new SignedJWT(new JWSHeader(JWSAlgorithm.HS256), claims);
      signedJWT.sign(signer);
      return signedJWT.serialize();
    } catch (Exception e) {
      log.error("Failed to generate access token", e);
      throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR);
    }
  }

  public JWTClaimsSet validateAndParseClaims(String token) {
    try {
      SignedJWT signedJWT = SignedJWT.parse(token);
      JWSVerifier verifier = new MACVerifier(secret.getBytes());
      if (!signedJWT.verify(verifier)) {
        throw new BusinessException(ErrorCode.INVALID_TOKEN);
      }
      JWTClaimsSet claims = signedJWT.getJWTClaimsSet();
      if (claims.getExpirationTime().before(new Date())) {
        throw new BusinessException(ErrorCode.EXPIRED_TOKEN);
      }
      return claims;
    } catch (BusinessException e) {
      throw e;
    } catch (Exception e) {
      log.warn("Invalid JWT token: {}", e.getMessage());
      throw new BusinessException(ErrorCode.INVALID_TOKEN);
    }
  }

  public Long extractUserId(String token) {
    JWTClaimsSet claims = validateAndParseClaims(token);
    return Long.parseLong(claims.getSubject());
  }
}
