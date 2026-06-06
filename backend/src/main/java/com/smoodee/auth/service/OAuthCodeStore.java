package com.smoodee.auth.service;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;

@Component
public class OAuthCodeStore {

  private final ConcurrentHashMap<String, CodeEntry> store = new ConcurrentHashMap<>();

  public record CodeEntry(Long userId, String rawRefreshToken, Instant expiresAt) {}

  public String createCode(Long userId, String rawRefreshToken) {
    String code = UUID.randomUUID().toString().replace("-", "");
    store.put(code, new CodeEntry(userId, rawRefreshToken, Instant.now().plusSeconds(60)));
    return code;
  }

  public Optional<CodeEntry> consumeCode(String code) {
    CodeEntry entry = store.remove(code);
    if (entry == null || Instant.now().isAfter(entry.expiresAt())) {
      return Optional.empty();
    }
    return Optional.of(entry);
  }
}
