package com.smoodee.chat.controller;

import com.smoodee.chat.dto.ChatMessageResponse;
import com.smoodee.chat.dto.SendMessageRequest;
import com.smoodee.chat.service.ChatService;
import com.smoodee.global.dto.ApiResponse;
import com.smoodee.global.security.CustomUserDetails;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Chat", description = "그룹 채팅 API (REST 폴링)")
@RestController
@RequestMapping("/api/v1/groups/{groupId}/chat")
@RequiredArgsConstructor
public class ChatController {

  private final ChatService chatService;

  @Operation(summary = "메시지 전송")
  @PostMapping
  public ResponseEntity<ApiResponse<ChatMessageResponse>> sendMessage(
      @AuthenticationPrincipal CustomUserDetails principal,
      @PathVariable Long groupId,
      @Valid @RequestBody SendMessageRequest request) {
    return ResponseEntity.ok(
        ApiResponse.of(
            ChatMessageResponse.from(
                chatService.sendMessage(groupId, principal.getUserId(), request.getBody()))));
  }

  @Operation(summary = "메시지 목록 조회 (cursor 페이징, 최신순)")
  @GetMapping
  public ResponseEntity<ApiResponse<List<ChatMessageResponse>>> listMessages(
      @AuthenticationPrincipal CustomUserDetails principal,
      @PathVariable Long groupId,
      @RequestParam(required = false) Long cursor,
      @RequestParam(defaultValue = "50") int limit) {
    List<ChatMessageResponse> result =
        chatService.listMessages(groupId, principal.getUserId(), cursor, limit).stream()
            .map(ChatMessageResponse::from)
            .collect(Collectors.toList());
    return ResponseEntity.ok(ApiResponse.of(result));
  }
}
