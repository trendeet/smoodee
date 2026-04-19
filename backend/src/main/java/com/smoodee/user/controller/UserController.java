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
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

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
    String avatarUrl = userService.resolveAvatarUrl(user.getAvatarS3Key());
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

  @Operation(summary = "프로필 이미지 업로드")
  @PostMapping(value = "/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public ResponseEntity<ApiResponse<String>> uploadAvatar(
      @AuthenticationPrincipal CustomUserDetails principal,
      @RequestParam("file") MultipartFile file) {
    String avatarUrl = userService.updateAvatar(principal.getUserId(), file);
    return ResponseEntity.ok(ApiResponse.of(avatarUrl));
  }

  @Operation(summary = "계정 삭제")
  @DeleteMapping
  public ResponseEntity<Void> deleteAccount(@AuthenticationPrincipal CustomUserDetails principal) {
    userService.deleteUser(principal.getUserId(), principal.getUserId());
    return ResponseEntity.noContent().build();
  }
}
