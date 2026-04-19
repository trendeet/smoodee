package com.smoodee.scrap.controller;

import com.smoodee.global.dto.ApiResponse;
import com.smoodee.global.security.CustomUserDetails;
import com.smoodee.scrap.dto.ScrapResponse;
import com.smoodee.scrap.service.ScrapService;
import com.smoodee.template.domain.TemplateType;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Scrap", description = "스크랩/북마크 API")
@RestController
@RequiredArgsConstructor
public class ScrapController {

  private final ScrapService scrapService;

  @Operation(summary = "스크랩 추가")
  @PostMapping("/api/v1/templates/{templateType}/scrap")
  public ResponseEntity<ApiResponse<Void>> addScrap(
      @AuthenticationPrincipal CustomUserDetails principal, @PathVariable String templateType) {
    scrapService.addScrap(principal.getUserId(), TemplateType.valueOf(templateType.toUpperCase()));
    return ResponseEntity.ok(ApiResponse.of(null));
  }

  @Operation(summary = "스크랩 취소")
  @DeleteMapping("/api/v1/templates/{templateType}/scrap")
  public ResponseEntity<ApiResponse<Void>> removeScrap(
      @AuthenticationPrincipal CustomUserDetails principal, @PathVariable String templateType) {
    scrapService.removeScrap(
        principal.getUserId(), TemplateType.valueOf(templateType.toUpperCase()));
    return ResponseEntity.ok(ApiResponse.of(null));
  }

  @Operation(summary = "내 스크랩 목록 조회")
  @GetMapping("/api/v1/me/scraps")
  public ResponseEntity<ApiResponse<List<ScrapResponse>>> listScraps(
      @AuthenticationPrincipal CustomUserDetails principal) {
    return ResponseEntity.ok(ApiResponse.of(scrapService.listScraps(principal.getUserId())));
  }
}
