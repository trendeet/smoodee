package com.smoodee.global.security;

import java.util.Map;
import lombok.Getter;

@Getter
public class OAuth2UserInfo {

  private final String provider;
  private final String subject;
  private final String email;
  private final String name;
  private final String pictureUrl;

  private OAuth2UserInfo(
      String provider, String subject, String email, String name, String pictureUrl) {
    this.provider = provider;
    this.subject = subject;
    this.email = email;
    this.name = name;
    this.pictureUrl = pictureUrl;
  }

  public static OAuth2UserInfo ofGoogle(Map<String, Object> attributes) {
    String email = (String) attributes.get("email");
    String googleName = (String) attributes.get("name");
    String name = googleName != null ? googleName : (email != null ? email.split("@")[0] : "user");
    String pictureUrl = (String) attributes.get("picture");
    return new OAuth2UserInfo("google", (String) attributes.get("sub"), email, name, pictureUrl);
  }

  @SuppressWarnings("unchecked")
  public static OAuth2UserInfo ofKakao(Map<String, Object> attributes) {
    Map<String, Object> kakaoAccount = (Map<String, Object>) attributes.get("kakao_account");
    Map<String, Object> profile =
        kakaoAccount != null ? (Map<String, Object>) kakaoAccount.get("profile") : Map.of();
    String email = kakaoAccount != null ? (String) kakaoAccount.get("email") : null;
    String nickname = (String) profile.getOrDefault("nickname", "카카오유저");
    String picture = (String) profile.get("profile_image_url");
    return new OAuth2UserInfo(
        "kakao", String.valueOf(attributes.get("id")), email, nickname, picture);
  }

  public static OAuth2UserInfo of(String provider, Map<String, Object> attributes) {
    return switch (provider.toLowerCase()) {
      case "google" -> ofGoogle(attributes);
      case "kakao" -> ofKakao(attributes);
      default -> throw new IllegalArgumentException("Unsupported provider: " + provider);
    };
  }
}
