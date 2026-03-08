package com.smoodee.preview.controller;

import com.smoodee.global.dto.ApiResponse;
import com.smoodee.global.security.CustomUserDetails;
import com.smoodee.preview.dto.PreviewResponse;
import com.smoodee.preview.service.PreviewService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Group", description = "그룹 미리보기 API")
@RestController
@RequestMapping("/api/v1/groups")
@RequiredArgsConstructor
public class PreviewController {

  private final PreviewService previewService;

  @Operation(summary = "그룹 미리보기", description = "현재까지 업로드된 배치 상태와 presigned URL 반환")
  @GetMapping("/{groupId}/preview")
  public ResponseEntity<ApiResponse<PreviewResponse>> getPreview(
      @AuthenticationPrincipal CustomUserDetails principal, @PathVariable Long groupId) {
    return ResponseEntity.ok(
        ApiResponse.of(previewService.getPreview(groupId, principal.getUserId())));
  }
}
