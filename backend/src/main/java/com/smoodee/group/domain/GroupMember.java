package com.smoodee.group.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(
    name = "group_members",
    uniqueConstraints = {@UniqueConstraint(columnNames = {"groupId", "userId"})},
    indexes = {@Index(name = "idx_group_member_group_id", columnList = "groupId")})
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class GroupMember {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false)
  private Long groupId;

  @Column(nullable = false)
  private Long userId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 10)
  private GroupMemberRole role;

  @Column(nullable = false)
  private LocalDateTime joinedAt;

  @Builder
  public GroupMember(Long groupId, Long userId, GroupMemberRole role) {
    this.groupId = groupId;
    this.userId = userId;
    this.role = role;
    this.joinedAt = LocalDateTime.now();
  }
}
