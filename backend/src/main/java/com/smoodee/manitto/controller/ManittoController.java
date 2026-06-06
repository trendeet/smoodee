package com.smoodee.manitto.controller;

import com.smoodee.global.dto.ApiResponse;
import com.smoodee.global.security.CustomUserDetails;
import com.smoodee.manitto.dto.CreateRoomRequest;
import com.smoodee.manitto.dto.DropItemRequest;
import com.smoodee.manitto.dto.JoinRoomRequest;
import com.smoodee.manitto.dto.ManittoItemResponse;
import com.smoodee.manitto.dto.ManittoLobbyResponse;
import com.smoodee.manitto.dto.MoveRequest;
import com.smoodee.manitto.dto.ManittoNotificationResponse;
import com.smoodee.manitto.dto.ManittoResultResponse;
import com.smoodee.manitto.dto.ManittoRoomResponse;
import com.smoodee.manitto.dto.ManittoVisitResponse;
import com.smoodee.manitto.dto.RecordVisitRequest;
import com.smoodee.manitto.dto.SendGreetRequest;
import com.smoodee.manitto.dto.SetNicknameRequest;
import com.smoodee.manitto.dto.SubmitDeductionRequest;
import com.smoodee.manitto.service.ManittoPresenceService;
import com.smoodee.manitto.service.ManittoService;
import com.smoodee.manitto.service.ManittoSseService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@Tag(name = "Manitto", description = "마니또 월드 API")
@RestController
@RequestMapping("/api/v1/manitto/rooms")
@RequiredArgsConstructor
public class ManittoController {

  private final ManittoService manittoService;
  private final ManittoSseService manittoSseService;
  private final ManittoPresenceService manittoPresenceService;

  @Operation(summary = "내 마니또 방 목록 조회")
  @GetMapping
  public ResponseEntity<ApiResponse<List<ManittoRoomResponse>>> getMyRooms(
      @AuthenticationPrincipal CustomUserDetails principal) {
    return ResponseEntity.ok(ApiResponse.of(manittoService.getMyRooms(principal.getUserId())));
  }

  @Operation(summary = "마니또 방 생성")
  @PostMapping
  public ResponseEntity<ApiResponse<ManittoRoomResponse>> createRoom(
      @AuthenticationPrincipal CustomUserDetails principal,
      @RequestBody CreateRoomRequest request) {
    return ResponseEntity.ok(
        ApiResponse.of(manittoService.createRoom(principal.getUserId(), request)));
  }

  @Operation(summary = "마니또 방 이벤트 구독 (SSE)")
  @GetMapping(value = "/{roomCode}/events", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
  public SseEmitter subscribeRoomEvents(@PathVariable String roomCode) {
    SseEmitter emitter = manittoSseService.subscribe(roomCode);
    // 신규 구독자에게 현재 접속 중인 사용자 목록을 즉시 전송
    for (Long userId : manittoPresenceService.getPresence(roomCode)) {
      manittoSseService.sendEventToEmitter(emitter, "user-entered", Map.of("userId", userId));
    }
    return emitter;
  }

  @Operation(summary = "마니또 방 조회")
  @GetMapping("/{roomCode}")
  public ResponseEntity<ApiResponse<ManittoRoomResponse>> getRoom(@PathVariable String roomCode) {
    return ResponseEntity.ok(ApiResponse.of(manittoService.getRoom(roomCode)));
  }

  @Operation(summary = "별칭 설정")
  @PatchMapping("/{roomCode}/nickname")
  public ResponseEntity<Void> setNickname(
      @AuthenticationPrincipal CustomUserDetails principal,
      @PathVariable String roomCode,
      @RequestBody SetNicknameRequest request) {
    manittoService.setNickname(roomCode, principal.getUserId(), request.getNickname());
    return ResponseEntity.noContent().build();
  }

  @Operation(summary = "마니또 방 참가")
  @PostMapping("/{roomCode}/join")
  public ResponseEntity<Void> joinRoom(
      @AuthenticationPrincipal CustomUserDetails principal,
      @PathVariable String roomCode,
      @RequestBody(required = false) JoinRoomRequest request) {
    manittoService.joinRoom(roomCode, principal.getUserId());
    return ResponseEntity.noContent().build();
  }

  @Operation(summary = "마니또 매칭 시작")
  @PatchMapping("/{roomCode}/start")
  public ResponseEntity<Void> startMatching(
      @AuthenticationPrincipal CustomUserDetails principal, @PathVariable String roomCode) {
    manittoService.startMatching(roomCode, principal.getUserId());
    return ResponseEntity.noContent().build();
  }

  @Operation(summary = "마니또 로비 조회")
  @GetMapping("/{roomCode}/lobby")
  public ResponseEntity<ApiResponse<ManittoLobbyResponse>> getLobby(
      @AuthenticationPrincipal CustomUserDetails principal, @PathVariable String roomCode) {
    return ResponseEntity.ok(
        ApiResponse.of(manittoService.getLobby(roomCode, principal.getUserId())));
  }

  @Operation(summary = "아이템 드롭 (마니또 선물 전달)")
  @PostMapping("/{roomCode}/items")
  public ResponseEntity<ApiResponse<ManittoItemResponse>> dropItem(
      @AuthenticationPrincipal CustomUserDetails principal,
      @PathVariable String roomCode,
      @RequestBody DropItemRequest request) {
    return ResponseEntity.ok(
        ApiResponse.of(manittoService.dropItem(roomCode, principal.getUserId(), request)));
  }

  @Operation(summary = "내 보관함 조회")
  @GetMapping("/{roomCode}/locker")
  public ResponseEntity<ApiResponse<List<ManittoItemResponse>>> getLocker(
      @AuthenticationPrincipal CustomUserDetails principal, @PathVariable String roomCode) {
    return ResponseEntity.ok(
        ApiResponse.of(manittoService.getLocker(roomCode, principal.getUserId())));
  }

  @Operation(summary = "유저 방 아이템 조회")
  @GetMapping("/{roomCode}/users/{targetUserId}/items")
  public ResponseEntity<ApiResponse<List<ManittoItemResponse>>> getUserItems(
      @PathVariable String roomCode, @PathVariable Long targetUserId) {
    return ResponseEntity.ok(ApiResponse.of(manittoService.getUserItems(roomCode, targetUserId)));
  }

  @Operation(summary = "아이템 사물함에 담기")
  @PatchMapping("/{roomCode}/locker/{itemId}/store")
  public ResponseEntity<Void> storeInLocker(
      @AuthenticationPrincipal CustomUserDetails principal,
      @PathVariable String roomCode,
      @PathVariable Long itemId) {
    manittoService.storeInLocker(roomCode, principal.getUserId(), itemId);
    return ResponseEntity.noContent().build();
  }

  @Operation(summary = "아이템 열기")
  @PatchMapping("/{roomCode}/locker/{itemId}/open")
  public ResponseEntity<Void> openItem(
      @AuthenticationPrincipal CustomUserDetails principal,
      @PathVariable String roomCode,
      @PathVariable Long itemId) {
    manittoService.openItem(roomCode, principal.getUserId(), itemId);
    return ResponseEntity.noContent().build();
  }

  @Operation(summary = "마니또 추리 제출")
  @PostMapping("/{roomCode}/deduction")
  public ResponseEntity<Void> submitDeduction(
      @AuthenticationPrincipal CustomUserDetails principal,
      @PathVariable String roomCode,
      @RequestBody SubmitDeductionRequest request) {
    manittoService.submitDeduction(roomCode, principal.getUserId(), request);
    return ResponseEntity.noContent().build();
  }

  @Operation(summary = "마니또 방 나가기 (방장이면 방 삭제)")
  @DeleteMapping("/{roomCode}")
  public ResponseEntity<Void> leaveRoom(
      @AuthenticationPrincipal CustomUserDetails principal, @PathVariable String roomCode) {
    manittoService.leaveRoom(roomCode, principal.getUserId());
    return ResponseEntity.noContent().build();
  }

  @Operation(summary = "마니또 결과 조회")
  @GetMapping("/{roomCode}/result")
  public ResponseEntity<ApiResponse<ManittoResultResponse>> getResult(
      @AuthenticationPrincipal CustomUserDetails principal, @PathVariable String roomCode) {
    return ResponseEntity.ok(
        ApiResponse.of(manittoService.getResult(roomCode, principal.getUserId())));
  }

  @Operation(summary = "방 입장 알림 (Presence)")
  @PutMapping("/{roomCode}/presence")
  public ResponseEntity<Void> enterPresence(
      @AuthenticationPrincipal CustomUserDetails principal, @PathVariable String roomCode) {
    Long userId = principal.getUserId();
    manittoPresenceService.enter(roomCode, userId);
    manittoSseService.sendEvent(roomCode, "user-entered", Map.of("userId", userId));
    return ResponseEntity.noContent().build();
  }

  @Operation(summary = "방 퇴장 알림 (Presence)")
  @DeleteMapping("/{roomCode}/presence")
  public ResponseEntity<Void> leavePresence(
      @AuthenticationPrincipal CustomUserDetails principal, @PathVariable String roomCode) {
    Long userId = principal.getUserId();
    manittoPresenceService.leave(roomCode, userId);
    manittoSseService.sendEvent(roomCode, "user-left", Map.of("userId", userId));
    return ResponseEntity.noContent().build();
  }

  @Operation(summary = "프리셋 인사 전송")
  @PostMapping("/{roomCode}/greet")
  public ResponseEntity<Void> sendGreet(
      @AuthenticationPrincipal CustomUserDetails principal,
      @PathVariable String roomCode,
      @RequestBody SendGreetRequest request) {
    Long userId = principal.getUserId();
    manittoSseService.sendEvent(
        roomCode, "greet-received", Map.of("fromUserId", userId, "text", request.getText()));
    return ResponseEntity.noContent().build();
  }

  @Operation(summary = "방문 기록 저장")
  @PostMapping("/{roomCode}/visit")
  public ResponseEntity<Void> recordVisit(
      @AuthenticationPrincipal CustomUserDetails principal,
      @PathVariable String roomCode,
      @RequestBody RecordVisitRequest request) {
    manittoService.recordVisit(roomCode, principal.getUserId(), request);
    return ResponseEntity.noContent().build();
  }

  @Operation(summary = "발자국 조회 (24h 이내)")
  @GetMapping("/{roomCode}/visits")
  public ResponseEntity<ApiResponse<List<ManittoVisitResponse>>> getVisits(
      @AuthenticationPrincipal CustomUserDetails principal, @PathVariable String roomCode) {
    return ResponseEntity.ok(
        ApiResponse.of(manittoService.getVisits(roomCode, principal.getUserId())));
  }

  @Operation(summary = "캐릭터 이동")
  @PostMapping("/{roomCode}/move")
  public ResponseEntity<Void> moveCharacter(
      @AuthenticationPrincipal CustomUserDetails principal,
      @PathVariable String roomCode,
      @RequestBody MoveRequest request) {
    manittoService.moveCharacter(roomCode, principal.getUserId(), request.getX(), request.getY());
    return ResponseEntity.noContent().build();
  }

  @Operation(summary = "알림 목록 조회")
  @GetMapping("/{roomCode}/notifications")
  public ResponseEntity<ApiResponse<List<ManittoNotificationResponse>>> getNotifications(
      @AuthenticationPrincipal CustomUserDetails principal, @PathVariable String roomCode) {
    return ResponseEntity.ok(
        ApiResponse.of(manittoService.getNotifications(roomCode, principal.getUserId())));
  }
}
