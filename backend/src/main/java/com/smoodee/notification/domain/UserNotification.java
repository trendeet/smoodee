package com.smoodee.notification.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
    name = "user_notifications",
    indexes = {@Index(name = "idx_notification_user_id", columnList = "userId")})
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UserNotification {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false)
  private Long userId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 30)
  private NotificationType type;

  private Long referenceId;

  @Column(nullable = false, length = 500)
  private String body;

  @Column(name = "is_read", nullable = false)
  private boolean read;

  @Column(nullable = false)
  private LocalDateTime createdAt;

  @Builder
  public UserNotification(Long userId, NotificationType type, Long referenceId, String body) {
    this.userId = userId;
    this.type = type;
    this.referenceId = referenceId;
    this.body = body;
    this.read = false;
    this.createdAt = LocalDateTime.now();
  }

  public void markRead() {
    this.read = true;
  }
}
