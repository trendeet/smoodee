package com.smoodee.scrap.dto;

import com.smoodee.scrap.domain.UserScrap;
import com.smoodee.template.dto.TemplateResponse;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ScrapResponse {

  private final String templateType;
  private final TemplateResponse template;

  public static ScrapResponse of(UserScrap scrap, TemplateResponse template) {
    return ScrapResponse.builder()
        .templateType(scrap.getTemplateType().name())
        .template(template)
        .build();
  }
}
