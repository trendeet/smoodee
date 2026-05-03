package com.smoodee.user.service;

import com.smoodee.global.exception.BusinessException;
import com.smoodee.global.exception.ErrorCode;
import com.smoodee.global.exception.ForbiddenException;
import com.smoodee.global.exception.NotFoundException;
import com.smoodee.global.security.OAuth2UserInfo;
import com.smoodee.storage.service.StorageService;
import com.smoodee.user.domain.User;
import com.smoodee.user.repository.UserRepository;
import java.io.IOException;
import java.time.Duration;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

  private final UserRepository userRepository;
  private final StorageService storageService;

  @Transactional
  public User upsertFromOAuth2(OAuth2UserInfo userInfo) {
    return userRepository
        .findByProviderAndSubject(userInfo.getProvider(), userInfo.getSubject())
        .map(
            user -> {
              user.updateFromOAuth2(userInfo.getEmail(), userInfo.getName());
              // 커스텀 업로드 아바타(avatars/로 시작)는 덮어쓰지 않음
              String currentAvatar = user.getAvatarS3Key();
              boolean hasCustomAvatar =
                  currentAvatar != null && currentAvatar.startsWith("avatars/");
              if (!hasCustomAvatar && userInfo.getPictureUrl() != null) {
                user.updateAvatarS3Key(userInfo.getPictureUrl());
              }
              return userRepository.save(user);
            })
        .orElseGet(
            () -> {
              User newUser =
                  User.builder()
                      .provider(userInfo.getProvider())
                      .subject(userInfo.getSubject())
                      .email(userInfo.getEmail())
                      .name(userInfo.getName())
                      .build();
              if (userInfo.getPictureUrl() != null) {
                newUser.updateAvatarS3Key(userInfo.getPictureUrl());
              }
              return userRepository.save(newUser);
            });
  }

  @Transactional(readOnly = true)
  public User getUser(Long userId) {
    return userRepository
        .findById(userId)
        .orElseThrow(() -> new NotFoundException(ErrorCode.USER_NOT_FOUND));
  }

  @Transactional
  public void updateProfile(Long userId, String name, String bio) {
    User user = getUser(userId);
    user.updateProfile(name, bio);
  }

  @Transactional
  public void updateAvatarS3Key(Long userId, String s3Key) {
    User user = getUser(userId);
    user.updateAvatarS3Key(s3Key);
  }

  @Transactional
  public String updateAvatar(Long userId, MultipartFile file) {
    try {
      String ext = "";
      String original = file.getOriginalFilename();
      if (original != null && original.contains(".")) {
        ext = original.substring(original.lastIndexOf("."));
      }
      String key = "avatars/" + userId + "/" + UUID.randomUUID() + ext;
      storageService.put(file.getInputStream(), key, file.getContentType(), file.getSize());
      User user = getUser(userId);
      user.updateAvatarS3Key(key);
      userRepository.save(user);
      return storageService.presignGet(key, Duration.ofDays(7));
    } catch (IOException e) {
      throw new BusinessException(ErrorCode.FILE_UPLOAD_FAILED);
    }
  }

  public String resolveAvatarUrl(String avatarS3Key) {
    if (avatarS3Key == null) return null;
    if (avatarS3Key.startsWith("http")) return avatarS3Key;
    return storageService.presignGet(avatarS3Key, Duration.ofDays(7));
  }

  @Transactional
  public void deleteUser(Long requestUserId, Long targetUserId) {
    if (!requestUserId.equals(targetUserId)) {
      throw new ForbiddenException(ErrorCode.FORBIDDEN);
    }
    userRepository.deleteById(targetUserId);
  }
}
