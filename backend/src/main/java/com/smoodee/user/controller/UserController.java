package com.smoodee.user.controller;

import com.smoodee.global.dto.ApiResponse;
import com.smoodee.global.security.CustomUserDetails;
import com.smoodee.user.domain.User;
import com.smoodee.user.dto.UpdateProfileRequest;
import com.smoodee.user.dto.UserProfileResponse;
import com.smoodee.user.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "User", description = "사용자 API")
@RestController
@RequestMapping("/api/v1/me")
@RequiredArgsConstructor
public class UserController {

  private final UserService userService;

  @Operation(summary = "내 프로필 조회")
  @GetMapping
  public ResponseEntity<ApiResponse<UserProfileResponse>> getMyProfile(
      @AuthenticationPrincipal CustomUserDetails principal) {
    User user = userService.getUser(principal.getUserId());
    // avatarUrl: S3 presigned URL (추후 StorageService 연동)
    String avatarUrl = null;
    return ResponseEntity.ok(ApiResponse.of(UserProfileResponse.of(user, avatarUrl)));
  }

  @Operation(summary = "프로필 수정")
  @PutMapping
  public ResponseEntity<ApiResponse<UserProfileResponse>> updateProfile(
      @AuthenticationPrincipal CustomUserDetails principal,
      @Valid @RequestBody UpdateProfileRequest request) {
    userService.updateProfile(principal.getUserId(), request.getName(), request.getBio());
    User user = userService.getUser(principal.getUserId());
    return ResponseEntity.ok(ApiResponse.of(UserProfileResponse.of(user, null)));
  }

  @Operation(summary = "계정 삭제")
  @DeleteMapping
  public ResponseEntity<Void> deleteAccount(@AuthenticationPrincipal CustomUserDetails principal) {
    userService.deleteUser(principal.getUserId(), principal.getUserId());
    return ResponseEntity.noContent().build();
  }
}
