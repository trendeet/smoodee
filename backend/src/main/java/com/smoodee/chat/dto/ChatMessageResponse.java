package com.smoodee.chat.dto;

import com.smoodee.chat.domain.ChatMessage;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ChatMessageResponse {

  private final Long id;
  private final Long userId;
  private final String body;
  private final LocalDateTime createdAt;

  public static ChatMessageResponse from(ChatMessage message) {
    return ChatMessageResponse.builder()
        .id(message.getId())
        .userId(message.getUserId())
        .body(message.getBody())
        .createdAt(message.getCreatedAt())
        .build();
  }
}
