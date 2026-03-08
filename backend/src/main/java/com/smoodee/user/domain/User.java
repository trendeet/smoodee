package com.smoodee.user.domain;

import com.smoodee.global.entity.BaseTimeEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(
    name = "users",
    uniqueConstraints = {@UniqueConstraint(columnNames = {"provider", "subject"})})
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class User extends BaseTimeEntity {

  @Column(nullable = false, length = 50)
  private String provider;

  @Column(nullable = false, length = 255)
  private String subject;

  @Column(length = 50)
  private String name;

  @Column(length = 200)
  private String bio;

  @Column(length = 500)
  private String avatarS3Key;

  @Column(length = 255)
  private String email;

  @Builder
  public User(String provider, String subject, String email, String name) {
    this.provider = provider;
    this.subject = subject;
    this.email = email;
    this.name = name;
  }

  public void updateProfile(String name, String bio) {
    if (name != null) {
      this.name = name;
    }
    if (bio != null) {
      this.bio = bio;
    }
  }

  public void updateAvatarS3Key(String avatarS3Key) {
    this.avatarS3Key = avatarS3Key;
  }

  public void updateFromOAuth2(String email, String name) {
    this.email = email;
    if (this.name == null) {
      this.name = name;
    }
  }
}
