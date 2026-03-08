package com.smoodee.template.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "templates")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Template {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, unique = true, length = 50)
  private TemplateType type;

  @Column(nullable = false, length = 100)
  private String title;

  @Column(length = 50)
  private String category;

  @Column(length = 255)
  private String tags;

  @Column(length = 500)
  private String description;

  @Builder
  public Template(
      TemplateType type, String title, String category, String tags, String description) {
    this.type = type;
    this.title = title;
    this.category = category;
    this.tags = tags;
    this.description = description;
  }
}
