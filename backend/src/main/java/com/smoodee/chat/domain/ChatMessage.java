package com.smoodee.chat.domain;

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
    name = "chat_messages",
    indexes = {
      @Index(name = "idx_chat_group_id", columnList = "groupId"),
      @Index(name = "idx_chat_created_at", columnList = "createdAt")
    })
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ChatMessage {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false)
  private Long groupId;

  @Column(nullable = false)
  private Long userId;

  @Column(nullable = false, columnDefinition = "TEXT")
  private String body;

  @Column(nullable = false)
  private LocalDateTime createdAt;

  @Builder
  public ChatMessage(Long groupId, Long userId, String body) {
    this.groupId = groupId;
    this.userId = userId;
    this.body = body;
    this.createdAt = LocalDateTime.now();
  }
}
