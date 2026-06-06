package com.smoodee.manitto.service;

import java.util.Collections;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Service;

@Service
public class ManittoPresenceService {

  private final Map<String, Set<Long>> presence = new ConcurrentHashMap<>();

  public void enter(String roomCode, Long userId) {
    presence.computeIfAbsent(roomCode, k -> ConcurrentHashMap.newKeySet()).add(userId);
  }

  public void leave(String roomCode, Long userId) {
    Set<Long> users = presence.get(roomCode);
    if (users != null) {
      users.remove(userId);
      if (users.isEmpty()) presence.remove(roomCode);
    }
  }

  public Set<Long> getPresence(String roomCode) {
    return Collections.unmodifiableSet(
        presence.getOrDefault(roomCode, Collections.emptySet()));
  }
}
