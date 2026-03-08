package com.smoodee.slot.controller;

import com.smoodee.global.dto.ApiResponse;
import com.smoodee.global.security.CustomUserDetails;
import com.smoodee.slot.dto.CreateSlotRequest;
import com.smoodee.slot.dto.GroupProgressResponse;
import com.smoodee.slot.dto.ReorderSlotsRequest;
import com.smoodee.slot.dto.SlotResponse;
import com.smoodee.slot.dto.SlotUploadRequest;
import com.smoodee.slot.dto.UpdateSlotRequest;
import com.smoodee.slot.service.SlotService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Group", description = "슬롯/업로드/제출현황 API")
@RestController
@RequestMapping("/api/v1/groups/{groupId}")
@RequiredArgsConstructor
public class SlotController {

  private final SlotService slotService;

  @Operation(summary = "슬롯 목록 조회")
  @GetMapping("/slots")
  public ResponseEntity<ApiResponse<List<SlotResponse>>> listSlots(
      @AuthenticationPrincipal CustomUserDetails principal, @PathVariable Long groupId) {
    List<SlotResponse> result =
        slotService.listSlots(groupId).stream()
            .map(SlotResponse::from)
            .collect(Collectors.toList());
    return ResponseEntity.ok(ApiResponse.of(result));
  }

  @Operation(summary = "슬롯 추가")
  @PostMapping("/slots")
  public ResponseEntity<ApiResponse<SlotResponse>> createSlot(
      @AuthenticationPrincipal CustomUserDetails principal,
      @PathVariable Long groupId,
      @Valid @RequestBody CreateSlotRequest request) {
    return ResponseEntity.ok(
        ApiResponse.of(
            SlotResponse.from(
                slotService.createSlot(
                    groupId, principal.getUserId(), request.getTimeLabel(), request.getDueAt()))));
  }

  @Operation(summary = "슬롯 수정")
  @PutMapping("/slots/{slotId}")
  public ResponseEntity<ApiResponse<SlotResponse>> updateSlot(
      @AuthenticationPrincipal CustomUserDetails principal,
      @PathVariable Long groupId,
      @PathVariable Long slotId,
      @Valid @RequestBody UpdateSlotRequest request) {
    return ResponseEntity.ok(
        ApiResponse.of(
            SlotResponse.from(
                slotService.updateSlot(
                    groupId,
                    slotId,
                    principal.getUserId(),
                    request.getTimeLabel(),
                    request.getDueAt()))));
  }

  @Operation(summary = "슬롯 삭제")
  @DeleteMapping("/slots/{slotId}")
  public ResponseEntity<Void> deleteSlot(
      @AuthenticationPrincipal CustomUserDetails principal,
      @PathVariable Long groupId,
      @PathVariable Long slotId) {
    slotService.deleteSlot(groupId, slotId, principal.getUserId());
    return ResponseEntity.noContent().build();
  }

  @Operation(summary = "슬롯 순서 변경")
  @PutMapping("/slots/reorder")
  public ResponseEntity<Void> reorderSlots(
      @AuthenticationPrincipal CustomUserDetails principal,
      @PathVariable Long groupId,
      @Valid @RequestBody ReorderSlotsRequest request) {
    slotService.reorderSlots(groupId, principal.getUserId(), request.getSlotIds());
    return ResponseEntity.noContent().build();
  }

  @Operation(summary = "슬롯 업로드 바인딩")
  @PutMapping("/slots/{slotId}/upload")
  public ResponseEntity<Void> bindUpload(
      @AuthenticationPrincipal CustomUserDetails principal,
      @PathVariable Long groupId,
      @PathVariable Long slotId,
      @Valid @RequestBody SlotUploadRequest request) {
    slotService.bindUpload(groupId, slotId, principal.getUserId(), request.getAssetId());
    return ResponseEntity.noContent().build();
  }

  @Operation(summary = "제출 현황(progress) 매트릭스 조회")
  @GetMapping("/progress")
  public ResponseEntity<ApiResponse<GroupProgressResponse>> getProgress(
      @AuthenticationPrincipal CustomUserDetails principal, @PathVariable Long groupId) {
    return ResponseEntity.ok(
        ApiResponse.of(slotService.getProgress(groupId, principal.getUserId())));
  }

  @Operation(summary = "그룹 진행 시작 (상태 IN_PROGRESS 전환)")
  @PostMapping("/start")
  public ResponseEntity<Void> startGroup(
      @AuthenticationPrincipal CustomUserDetails principal, @PathVariable Long groupId) {
    slotService.startGroup(groupId, principal.getUserId());
    return ResponseEntity.noContent().build();
  }
}
