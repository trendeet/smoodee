package com.smoodee.chat.repository;

import com.smoodee.chat.domain.ChatMessage;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

  @Query(
      "SELECT m FROM ChatMessage m WHERE m.groupId = :groupId AND (:cursor IS NULL OR m.id < :cursor) ORDER BY m.id DESC")
  List<ChatMessage> findByGroupIdWithCursor(
      @Param("groupId") Long groupId, @Param("cursor") Long cursor, Pageable pageable);
}
