package com.smoodee.user.dto;

import com.smoodee.user.domain.User;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class UserProfileResponse {

  private final Long id;
  private final String name;
  private final String bio;
  private final String avatarUrl;
  private final String email;

  public static UserProfileResponse of(User user, String avatarUrl) {
    return UserProfileResponse.builder()
        .id(user.getId())
        .name(user.getName())
        .bio(user.getBio())
        .avatarUrl(avatarUrl)
        .email(user.getEmail())
        .build();
  }
}
