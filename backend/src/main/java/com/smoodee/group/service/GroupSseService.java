package com.smoodee.group.service;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@Slf4j
@Service
public class GroupSseService {

  private final Map<Long, CopyOnWriteArrayList<SseEmitter>> emitters = new ConcurrentHashMap<>();

  public SseEmitter subscribe(Long groupId) {
    SseEmitter emitter = new SseEmitter(0L);
    emitters.computeIfAbsent(groupId, k -> new CopyOnWriteArrayList<>()).add(emitter);

    Runnable cleanup = () -> remove(groupId, emitter);
    emitter.onCompletion(cleanup);
    emitter.onTimeout(cleanup);
    emitter.onError(e -> cleanup.run());

    return emitter;
  }

  public void notifyMemberChanged(Long groupId) {
    CopyOnWriteArrayList<SseEmitter> list = emitters.get(groupId);
    if (list == null || list.isEmpty()) return;

    list.removeIf(
        emitter -> {
          try {
            emitter.send(SseEmitter.event().name("member-changed").data(""));
            return false;
          } catch (IOException e) {
            return true;
          }
        });
  }

  private void remove(Long groupId, SseEmitter emitter) {
    CopyOnWriteArrayList<SseEmitter> list = emitters.get(groupId);
    if (list != null) list.remove(emitter);
  }
}
