package com.smoodee.notification.dto;

import com.smoodee.notification.domain.UserNotification;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class NotificationResponse {

  private final Long id;
  private final String type;
  private final Long referenceId;
  private final String body;
  private final boolean read;
  private final LocalDateTime createdAt;

  public static NotificationResponse from(UserNotification notification) {
    return NotificationResponse.builder()
        .id(notification.getId())
        .type(notification.getType().name())
        .referenceId(notification.getReferenceId())
        .body(notification.getBody())
        .read(notification.isRead())
        .createdAt(notification.getCreatedAt())
        .build();
  }
}
