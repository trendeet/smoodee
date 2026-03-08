package com.smoodee.render.controller;

import com.smoodee.global.dto.ApiResponse;
import com.smoodee.global.security.CustomUserDetails;
import com.smoodee.render.domain.RenderJob;
import com.smoodee.render.dto.RenderJobResponse;
import com.smoodee.render.service.RenderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Render", description = "렌더 작업 API")
@RestController
@RequestMapping("/api/v1/render")
@RequiredArgsConstructor
public class RenderController {

  private final RenderService renderService;

  @Operation(summary = "개인 렌더 요청 (Colorwork → 이미지 생성)")
  @PostMapping("/personal/{projectId}")
  public ResponseEntity<ApiResponse<RenderJobResponse>> submitPersonalRender(
      @AuthenticationPrincipal CustomUserDetails principal, @PathVariable Long projectId) {
    RenderJob job = renderService.submitPersonalRender(projectId, principal.getUserId());
    return ResponseEntity.ok(ApiResponse.of(RenderJobResponse.from(job)));
  }

  @Operation(summary = "그룹 Export 요청 (DayShare → 합본 영상 생성)")
  @PostMapping("/group/{groupId}")
  public ResponseEntity<ApiResponse<RenderJobResponse>> submitGroupRender(
      @AuthenticationPrincipal CustomUserDetails principal, @PathVariable Long groupId) {
    RenderJob job = renderService.submitGroupRender(groupId, principal.getUserId());
    return ResponseEntity.ok(ApiResponse.of(RenderJobResponse.from(job)));
  }

  @Operation(summary = "렌더 작업 상태 조회")
  @GetMapping("/jobs/{jobId}")
  public ResponseEntity<ApiResponse<RenderJobResponse>> getRenderJob(
      @AuthenticationPrincipal CustomUserDetails principal, @PathVariable Long jobId) {
    return ResponseEntity.ok(
        ApiResponse.of(RenderJobResponse.from(renderService.getRenderJob(jobId))));
  }

  @Operation(summary = "렌더 작업 재시도 (FAILED 상태만 가능)")
  @PostMapping("/jobs/{jobId}/retry")
  public ResponseEntity<ApiResponse<RenderJobResponse>> retryRenderJob(
      @AuthenticationPrincipal CustomUserDetails principal, @PathVariable Long jobId) {
    RenderJob job = renderService.retryRenderJob(jobId, principal.getUserId());
    return ResponseEntity.ok(ApiResponse.of(RenderJobResponse.from(job)));
  }

  @Operation(summary = "렌더 결과 다운로드 URL 발급 (SUCCEEDED만, TTL 10분)")
  @GetMapping("/jobs/{jobId}/download-url")
  public ResponseEntity<ApiResponse<Map<String, String>>> getDownloadUrl(
      @AuthenticationPrincipal CustomUserDetails principal, @PathVariable Long jobId) {
    String url = renderService.getDownloadUrl(jobId, principal.getUserId());
    return ResponseEntity.ok(ApiResponse.of(Map.of("url", url)));
  }
}
