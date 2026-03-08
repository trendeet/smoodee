package com.smoodee.scrap.service;

import com.smoodee.global.exception.BusinessException;
import com.smoodee.global.exception.ErrorCode;
import com.smoodee.global.exception.NotFoundException;
import com.smoodee.scrap.domain.UserScrap;
import com.smoodee.scrap.dto.ScrapResponse;
import com.smoodee.scrap.repository.UserScrapRepository;
import com.smoodee.template.domain.TemplateType;
import com.smoodee.template.dto.TemplateResponse;
import com.smoodee.template.service.TemplateService;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ScrapService {

  private final UserScrapRepository userScrapRepository;
  private final TemplateService templateService;

  @Transactional
  public void addScrap(Long userId, TemplateType templateType) {
    if (userScrapRepository.existsByUserIdAndTemplateType(userId, templateType)) {
      throw new BusinessException(ErrorCode.INVALID_INPUT);
    }
    userScrapRepository.save(UserScrap.builder().userId(userId).templateType(templateType).build());
  }

  @Transactional
  public void removeScrap(Long userId, TemplateType templateType) {
    UserScrap scrap =
        userScrapRepository
            .findByUserIdAndTemplateType(userId, templateType)
            .orElseThrow(() -> new NotFoundException(ErrorCode.RESOURCE_NOT_FOUND));
    userScrapRepository.delete(scrap);
  }

  @Transactional(readOnly = true)
  public List<ScrapResponse> listScraps(Long userId) {
    return userScrapRepository.findByUserId(userId).stream()
        .map(
            scrap ->
                ScrapResponse.of(
                    scrap,
                    TemplateResponse.from(templateService.getByType(scrap.getTemplateType()))))
        .collect(Collectors.toList());
  }
}
