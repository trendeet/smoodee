package com.smoodee.manitto.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@Slf4j
@Service
@RequiredArgsConstructor
public class ManittoSseService {

  private final ObjectMapper objectMapper;
  private final Map<String, CopyOnWriteArrayList<SseEmitter>> emitters = new ConcurrentHashMap<>();

  public SseEmitter subscribe(String roomCode) {
    SseEmitter emitter = new SseEmitter(0L);
    emitters.computeIfAbsent(roomCode, k -> new CopyOnWriteArrayList<>()).add(emitter);

    Runnable cleanup = () -> remove(roomCode, emitter);
    emitter.onCompletion(cleanup);
    emitter.onTimeout(cleanup);
    emitter.onError(e -> cleanup.run());

    return emitter;
  }

  public void notifyRoomChanged(String roomCode) {
    CopyOnWriteArrayList<SseEmitter> list = emitters.get(roomCode);
    if (list == null || list.isEmpty()) return;

    list.removeIf(
        emitter -> {
          try {
            emitter.send(SseEmitter.event().name("room-updated").data(""));
            return false;
          } catch (IOException e) {
            return true;
          }
        });
  }

  public void sendEvent(String roomCode, String eventName, Object payload) {
    CopyOnWriteArrayList<SseEmitter> list = emitters.get(roomCode);
    if (list == null || list.isEmpty()) return;
    try {
      String data = objectMapper.writeValueAsString(payload);
      list.removeIf(emitter -> {
        try {
          emitter.send(SseEmitter.event().name(eventName).data(data));
          return false;
        } catch (IOException e) {
          return true;
        }
      });
    } catch (Exception e) {
      log.warn("SSE sendEvent serialization failed: {}", e.getMessage());
    }
  }

  public void sendEventToEmitter(SseEmitter emitter, String eventName, Object payload) {
    try {
      String data = objectMapper.writeValueAsString(payload);
      emitter.send(SseEmitter.event().name(eventName).data(data));
    } catch (Exception e) {
      log.warn("SSE sendEventToEmitter failed: {}", e.getMessage());
    }
  }

  private void remove(String roomCode, SseEmitter emitter) {
    CopyOnWriteArrayList<SseEmitter> list = emitters.get(roomCode);
    if (list != null) list.remove(emitter);
  }
}
