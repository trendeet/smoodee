package com.smoodee.scheduler;

import com.smoodee.group.repository.GroupMemberRepository;
import com.smoodee.notification.domain.NotificationType;
import com.smoodee.notification.service.NotificationService;
import com.smoodee.slot.domain.Slot;
import com.smoodee.slot.domain.SlotUploadStatus;
import com.smoodee.slot.repository.SlotRepository;
import com.smoodee.slot.repository.SlotUploadRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Component
@RequiredArgsConstructor
public class SlotDeadlineNotificationScheduler {

  private final SlotRepository slotRepository;
  private final SlotUploadRepository slotUploadRepository;
  private final GroupMemberRepository groupMemberRepository;
  private final NotificationService notificationService;

  @Scheduled(cron = "0 0 * * * *") // 매 정시
  @Transactional
  public void notifyDeadlineNear() {
    LocalDateTime now = LocalDateTime.now();
    LocalDateTime windowStart = now;
    LocalDateTime windowEnd = now.plusHours(24);

    List<Slot> nearDeadlineSlots =
        slotRepository.findAll().stream()
            .filter(
                slot ->
                    slot.getDueAt() != null
                        && slot.getDueAt().isAfter(windowStart)
                        && slot.getDueAt().isBefore(windowEnd))
            .collect(Collectors.toList());

    for (Slot slot : nearDeadlineSlots) {
      List<Long> allMemberIds =
          groupMemberRepository.findByGroupId(slot.getGroupId()).stream()
              .map(m -> m.getUserId())
              .collect(Collectors.toList());

      Set<Long> uploadedUserIds =
          slotUploadRepository.findBySlotId(slot.getId()).stream()
              .filter(u -> u.getStatus() == SlotUploadStatus.UPLOADED)
              .map(u -> u.getUserId())
              .collect(Collectors.toSet());

      for (Long memberId : allMemberIds) {
        if (!uploadedUserIds.contains(memberId)) {
          notificationService.create(
              memberId,
              NotificationType.SLOT_DEADLINE_NEAR,
              slot.getId(),
              String.format("'%s' 슬롯 마감 24시간 전입니다. 영상을 업로드해주세요.", slot.getTimeLabel()));
        }
      }
    }
  }
}
