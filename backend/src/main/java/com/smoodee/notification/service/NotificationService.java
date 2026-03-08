package com.smoodee.notification.service;

import com.smoodee.global.exception.ErrorCode;
import com.smoodee.global.exception.ForbiddenException;
import com.smoodee.global.exception.NotFoundException;
import com.smoodee.notification.domain.NotificationType;
import com.smoodee.notification.domain.UserNotification;
import com.smoodee.notification.repository.UserNotificationRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class NotificationService {

  private final UserNotificationRepository notificationRepository;

  @Transactional
  public UserNotification create(
      Long userId, NotificationType type, Long referenceId, String body) {
    return notificationRepository.save(
        UserNotification.builder()
            .userId(userId)
            .type(type)
            .referenceId(referenceId)
            .body(body)
            .build());
  }

  @Transactional(readOnly = true)
  public List<UserNotification> listNotifications(Long userId, Long cursor, int limit) {
    return notificationRepository.findByUserIdWithCursor(
        userId, cursor, PageRequest.of(0, Math.min(limit, 100)));
  }

  @Transactional
  public void markRead(Long notificationId, Long userId) {
    UserNotification notification =
        notificationRepository
            .findById(notificationId)
            .orElseThrow(() -> new NotFoundException(ErrorCode.RESOURCE_NOT_FOUND));
    if (!notification.getUserId().equals(userId)) {
      throw new ForbiddenException(ErrorCode.FORBIDDEN);
    }
    notification.markRead();
  }

  @Transactional
  public void markAllRead(Long userId) {
    notificationRepository.markAllRead(userId);
  }
}
