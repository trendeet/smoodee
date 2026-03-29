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
  private final String userName;
  private final String body;
  private final LocalDateTime createdAt;

  public static ChatMessageResponse from(ChatMessage message, String userName) {
    return ChatMessageResponse.builder()
        .id(message.getId())
        .userId(message.getUserId())
        .userName(userName)
        .body(message.getBody())
        .createdAt(message.getCreatedAt())
        .build();
  }
}
