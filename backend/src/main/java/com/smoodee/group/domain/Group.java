package com.smoodee.group.domain;

import com.smoodee.global.entity.BaseTimeEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(
    name = "user_groups",
    indexes = {@Index(name = "idx_group_invite_code", columnList = "inviteCode", unique = true)})
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Group extends BaseTimeEntity {

  @Column(nullable = false)
  private Long projectId;

  @Column(nullable = false, length = 100)
  private String name;

  @Column(nullable = false, columnDefinition = "int default 8")
  private int memberCount = 8;

  @Column(nullable = false, unique = true, length = 20)
  private String inviteCode;

  @Column(nullable = true, length = 500)
  private String coverImageS3Key;

  @Builder
  public Group(Long projectId, String name, String inviteCode) {
    this.projectId = projectId;
    this.name = name;
    this.memberCount = 8;
    this.inviteCode = inviteCode;
  }

  public void updateCoverImage(String s3Key) {
    this.coverImageS3Key = s3Key;
  }
}
