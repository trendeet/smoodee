package com.smoodee.template.dto;

import com.smoodee.template.domain.Template;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class TemplateResponse {

  private final Long id;
  private final String type;
  private final String title;
  private final String category;
  private final String tags;
  private final String description;

  public static TemplateResponse from(Template template) {
    return TemplateResponse.builder()
        .id(template.getId())
        .type(template.getType().name())
        .title(template.getTitle())
        .category(template.getCategory())
        .tags(template.getTags())
        .description(template.getDescription())
        .build();
  }
}
