package com.smoodee.personal.controller;

import com.smoodee.global.dto.ApiResponse;
import com.smoodee.global.security.CustomUserDetails;
import com.smoodee.personal.domain.GridType;
import com.smoodee.personal.dto.ColorworkStateResponse;
import com.smoodee.personal.dto.FrameBindRequest;
import com.smoodee.personal.dto.GridSelectRequest;
import com.smoodee.personal.dto.PaletteSelectRequest;
import com.smoodee.personal.dto.PaletteShuffleResponse;
import com.smoodee.personal.service.ColorworkService;
import com.smoodee.project.domain.Project;
import com.smoodee.project.dto.ProjectResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Personal", description = "개인 컬러워크 API")
@RestController
@RequestMapping("/api/v1/personal/colorwork")
@RequiredArgsConstructor
public class ColorworkController {

  private final ColorworkService colorworkService;

  @Operation(summary = "컬러워크 프로젝트 생성")
  @PostMapping("/projects")
  public ResponseEntity<ApiResponse<ProjectResponse>> createProject(
      @AuthenticationPrincipal CustomUserDetails principal) {
    Project project = colorworkService.createColorworkProject(principal.getUserId());
    return ResponseEntity.ok(ApiResponse.of(ProjectResponse.from(project)));
  }

  @Operation(summary = "사용법 확인 완료 저장")
  @PutMapping("/{projectId}/howto-seen")
  public ResponseEntity<Void> markHowtoSeen(
      @AuthenticationPrincipal CustomUserDetails principal, @PathVariable Long projectId) {
    colorworkService.markHowtoSeen(projectId, principal.getUserId());
    return ResponseEntity.noContent().build();
  }

  @Operation(summary = "팔레트 셔플 (새 3색 세트 생성)")
  @PostMapping("/{projectId}/palette/shuffle")
  public ResponseEntity<ApiResponse<PaletteShuffleResponse>> shufflePalette(
      @AuthenticationPrincipal CustomUserDetails principal, @PathVariable Long projectId) {
    return ResponseEntity.ok(
        ApiResponse.of(colorworkService.shufflePalette(projectId, principal.getUserId())));
  }

  @Operation(summary = "팔레트 선택 저장")
  @PutMapping("/{projectId}/palette/select")
  public ResponseEntity<Void> selectPalette(
      @AuthenticationPrincipal CustomUserDetails principal,
      @PathVariable Long projectId,
      @Valid @RequestBody PaletteSelectRequest request) {
    colorworkService.selectPalette(
        projectId, principal.getUserId(), request.getSeed(), request.getColors());
    return ResponseEntity.noContent().build();
  }

  @Operation(summary = "그리드 타입 선택 (G2=2x2, G3=3x3)")
  @PutMapping("/{projectId}/grid")
  public ResponseEntity<Void> selectGrid(
      @AuthenticationPrincipal CustomUserDetails principal,
      @PathVariable Long projectId,
      @Valid @RequestBody GridSelectRequest request) {
    colorworkService.selectGrid(
        projectId, principal.getUserId(), GridType.valueOf(request.getGridType().toUpperCase()));
    return ResponseEntity.noContent().build();
  }

  @Operation(summary = "프레임별 에셋 바인딩 (G2=0~3, G3=0~8)")
  @PutMapping("/{projectId}/frames/{index}")
  public ResponseEntity<Void> bindFrame(
      @AuthenticationPrincipal CustomUserDetails principal,
      @PathVariable Long projectId,
      @PathVariable int index,
      @Valid @RequestBody FrameBindRequest request) {
    colorworkService.bindFrame(projectId, principal.getUserId(), index, request.getAssetId());
    return ResponseEntity.noContent().build();
  }

  @Operation(summary = "컬러워크 현재 상태 조회")
  @GetMapping("/{projectId}")
  public ResponseEntity<ApiResponse<ColorworkStateResponse>> getState(
      @AuthenticationPrincipal CustomUserDetails principal, @PathVariable Long projectId) {
    return ResponseEntity.ok(
        ApiResponse.of(colorworkService.getState(projectId, principal.getUserId())));
  }
}
