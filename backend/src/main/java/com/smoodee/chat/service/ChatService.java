package com.smoodee.chat.service;

import com.smoodee.chat.domain.ChatMessage;
import com.smoodee.chat.repository.ChatMessageRepository;
import com.smoodee.group.service.GroupService;
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

  @Transactional
  public ChatMessage sendMessage(Long groupId, Long userId, String body) {
    groupService.requireMember(groupId, userId);
    ChatMessage message = ChatMessage.builder().groupId(groupId).userId(userId).body(body).build();
    return chatMessageRepository.save(message);
  }

  @Transactional(readOnly = true)
  public List<ChatMessage> listMessages(Long groupId, Long userId, Long cursor, int limit) {
    groupService.requireMember(groupId, userId);
    return chatMessageRepository.findByGroupIdWithCursor(
        groupId, cursor, PageRequest.of(0, Math.min(limit, 100)));
  }
}
