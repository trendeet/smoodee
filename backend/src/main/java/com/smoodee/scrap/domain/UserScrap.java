package com.smoodee.scrap.domain;

import com.smoodee.template.domain.TemplateType;
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
    name = "user_scraps",
    uniqueConstraints = {@UniqueConstraint(columnNames = {"userId", "templateType"})},
    indexes = {@Index(name = "idx_user_scrap_user_id", columnList = "userId")})
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UserScrap {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false)
  private Long userId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 30)
  private TemplateType templateType;

  @Column(nullable = false)
  private LocalDateTime scrapedAt;

  @Builder
  public UserScrap(Long userId, TemplateType templateType) {
    this.userId = userId;
    this.templateType = templateType;
    this.scrapedAt = LocalDateTime.now();
  }
}
