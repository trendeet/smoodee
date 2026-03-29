package com.smoodee.template.service;

import com.smoodee.global.exception.ErrorCode;
import com.smoodee.global.exception.NotFoundException;
import com.smoodee.template.domain.Template;
import com.smoodee.template.domain.TemplateType;
import com.smoodee.template.repository.TemplateRepository;
import jakarta.annotation.PostConstruct;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class TemplateService {

  private final TemplateRepository templateRepository;

  @PostConstruct
  @Transactional
  public void seed() {
    upsert(TemplateType.COLORWORK, "컬러워크", "STORY", "컬러,팔레트,무드,개인",
        "팔레트 셔플로 나만의 감각적인 컬러 그리드 이미지를 만들어보세요.");
    upsert(TemplateType.DAYSHARE, "하루 일상 공유", "GROUP", "그룹,하루,공유,합본",
        "시간 슬롯별로 멤버들의 일상을 모아 영상을 자동 생성합니다.");
    log.info("Template seed completed");
  }

  private void upsert(TemplateType type, String title, String category, String tags, String description) {
    templateRepository.findByType(type).ifPresentOrElse(
        t -> {
          t.update(title, category, tags, description);
          templateRepository.save(t);
        },
        () -> templateRepository.save(
            Template.builder()
                .type(type).title(title).category(category).tags(tags).description(description)
                .build()));
  }

  @Transactional(readOnly = true)
  public List<Template> findByFilter(String category, String keyword) {
    String cat = (category == null || category.isBlank()) ? null : category;
    String kw = (keyword == null || keyword.isBlank()) ? null : keyword;
    return templateRepository.findByFilter(cat, kw);
  }

  @Transactional(readOnly = true)
  public Template getByType(TemplateType type) {
    return templateRepository
        .findByType(type)
        .orElseThrow(() -> new NotFoundException(ErrorCode.TEMPLATE_NOT_FOUND));
  }
}
