package com.smoodee.user.service;

import com.smoodee.global.exception.ErrorCode;
import com.smoodee.global.exception.ForbiddenException;
import com.smoodee.global.exception.NotFoundException;
import com.smoodee.global.security.OAuth2UserInfo;
import com.smoodee.user.domain.User;
import com.smoodee.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

  private final UserRepository userRepository;

  @Transactional
  public User upsertFromOAuth2(OAuth2UserInfo userInfo) {
    return userRepository
        .findByProviderAndSubject(userInfo.getProvider(), userInfo.getSubject())
        .map(
            user -> {
              user.updateFromOAuth2(userInfo.getEmail(), userInfo.getName());
              return user;
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
  public void deleteUser(Long requestUserId, Long targetUserId) {
    if (!requestUserId.equals(targetUserId)) {
      throw new ForbiddenException(ErrorCode.FORBIDDEN);
    }
    userRepository.deleteById(targetUserId);
  }
}
