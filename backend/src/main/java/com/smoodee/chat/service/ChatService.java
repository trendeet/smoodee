package com.smoodee.chat.service;

import com.smoodee.chat.domain.ChatMessage;
import com.smoodee.chat.repository.ChatMessageRepository;
import com.smoodee.group.service.GroupService;
import com.smoodee.notification.domain.NotificationType;
import com.smoodee.notification.service.NotificationService;
import com.smoodee.user.service.UserService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ChatService {

  private final ChatMessageRepository chatMessageRepository;
  private final GroupService groupService;
  private final NotificationService notificationService;
  private final UserService userService;

  @Transactional
  public ChatMessage sendMessage(Long groupId, Long userId, String body) {
    groupService.requireMember(groupId, userId);
    ChatMessage message = ChatMessage.builder().groupId(groupId).userId(userId).body(body).build();
    ChatMessage saved = chatMessageRepository.save(message);

    String senderName = userService.getUser(userId).getName();
    String groupName = groupService.getGroup(groupId).getName();
    String preview = body.length() > 10 ? body.substring(0, 10) + "..." : body;
    String notifBody = "[" + groupName + "] " + senderName + ": " + preview;

    groupService.getMembers(groupId).stream()
        .filter(m -> !m.getUserId().equals(userId))
        .forEach(m -> notificationService.create(
            m.getUserId(), NotificationType.NEW_CHAT_MESSAGE, groupId, notifBody));

    return saved;
  }

  @Transactional(readOnly = true)
  public List<ChatMessage> listMessages(Long groupId, Long userId, Long cursor, int limit) {
    groupService.requireMember(groupId, userId);
    return chatMessageRepository.findByGroupIdWithCursor(
        groupId, cursor, PageRequest.of(0, Math.min(limit, 100)));
  }
}
