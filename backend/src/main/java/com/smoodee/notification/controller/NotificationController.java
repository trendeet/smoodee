package com.smoodee.notification.controller;

import com.smoodee.global.dto.ApiResponse;
import com.smoodee.global.security.CustomUserDetails;
import com.smoodee.notification.dto.NotificationResponse;
import com.smoodee.notification.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Notification", description = "인앱 알림 API")
@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController {

  private final NotificationService notificationService;

  @Operation(summary = "알림 목록 조회 (cursor 페이징)")
  @GetMapping
  public ResponseEntity<ApiResponse<List<NotificationResponse>>> listNotifications(
      @AuthenticationPrincipal CustomUserDetails principal,
      @RequestParam(required = false) Long cursor,
      @RequestParam(defaultValue = "20") int limit) {
    List<NotificationResponse> result =
        notificationService.listNotifications(principal.getUserId(), cursor, limit).stream()
            .map(NotificationResponse::from)
            .collect(Collectors.toList());
    return ResponseEntity.ok(ApiResponse.of(result));
  }

  @Operation(summary = "알림 읽음 처리")
  @PutMapping("/{id}/read")
  public ResponseEntity<Void> markRead(
      @AuthenticationPrincipal CustomUserDetails principal, @PathVariable Long id) {
    notificationService.markRead(id, principal.getUserId());
    return ResponseEntity.noContent().build();
  }

  @Operation(summary = "전체 알림 읽음 처리")
  @PutMapping("/read-all")
  public ResponseEntity<Void> markAllRead(@AuthenticationPrincipal CustomUserDetails principal) {
    notificationService.markAllRead(principal.getUserId());
    return ResponseEntity.noContent().build();
  }
}
