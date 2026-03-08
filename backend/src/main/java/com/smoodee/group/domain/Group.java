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

  @Column(nullable = false)
  private int memberCount;

  @Column(nullable = false, unique = true, length = 20)
  private String inviteCode;

  @Builder
  public Group(Long projectId, String name, int memberCount, String inviteCode) {
    this.projectId = projectId;
    this.name = name;
    this.memberCount = memberCount;
    this.inviteCode = inviteCode;
  }
}
