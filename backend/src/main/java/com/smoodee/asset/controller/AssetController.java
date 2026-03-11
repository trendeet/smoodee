package com.smoodee.asset.controller;

import com.smoodee.asset.dto.AssetResponse;
import com.smoodee.asset.service.AssetService;
import com.smoodee.global.dto.ApiResponse;
import com.smoodee.global.security.CustomUserDetails;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@Tag(name = "Upload", description = "파일 업로드/다운로드 API")
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class AssetController {

  private final AssetService assetService;

  @Operation(summary = "파일 업로드", description = "프로젝트에 이미지/영상 업로드")
  @PostMapping("/projects/{projectId}/assets")
  public ResponseEntity<ApiResponse<AssetResponse>> uploadAsset(
      @AuthenticationPrincipal CustomUserDetails principal,
      @PathVariable Long projectId,
      @RequestParam("file") MultipartFile file) {
    var asset = assetService.upload(projectId, principal.getUserId(), file);
    String url = assetService.generateDownloadUrl(asset.getId(), principal.getUserId());
    return ResponseEntity.ok(ApiResponse.of(AssetResponse.from(asset, url)));
  }

  @Operation(summary = "에셋 메타 조회")
  @GetMapping("/assets/{assetId}")
  public ResponseEntity<ApiResponse<AssetResponse>> getAsset(
      @AuthenticationPrincipal CustomUserDetails principal, @PathVariable Long assetId) {
    return ResponseEntity.ok(
        ApiResponse.of(
            AssetResponse.from(
                assetService.getAssetWithAccessCheck(assetId, principal.getUserId()))));
  }

  @Operation(summary = "에셋 다운로드 URL 발급 (Presigned, TTL 10분)")
  @GetMapping("/assets/{assetId}/download-url")
  public ResponseEntity<ApiResponse<Map<String, String>>> getDownloadUrl(
      @AuthenticationPrincipal CustomUserDetails principal, @PathVariable Long assetId) {
    String url = assetService.generateDownloadUrl(assetId, principal.getUserId());
    return ResponseEntity.ok(ApiResponse.of(Map.of("url", url)));
  }
}
