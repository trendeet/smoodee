package com.smoodee.template.controller;

import com.smoodee.global.dto.ApiResponse;
import com.smoodee.template.domain.TemplateType;
import com.smoodee.template.dto.TemplateResponse;
import com.smoodee.template.service.TemplateService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Template", description = "템플릿 카탈로그 API")
@RestController
@RequestMapping("/api/v1/templates")
@RequiredArgsConstructor
public class TemplateController {

  private final TemplateService templateService;

  @Operation(summary = "템플릿 목록 조회", description = "카테고리·키워드 필터 지원. 미입력 시 전체 반환.")
  @GetMapping
  public ResponseEntity<ApiResponse<List<TemplateResponse>>> listTemplates(
      @RequestParam(required = false) String category,
      @RequestParam(required = false) String keyword) {
    List<TemplateResponse> result =
        templateService.findByFilter(category, keyword).stream()
            .map(TemplateResponse::from)
            .collect(Collectors.toList());
    return ResponseEntity.ok(ApiResponse.of(result));
  }

  @Operation(summary = "템플릿 상세 조회")
  @GetMapping("/{templateType}")
  public ResponseEntity<ApiResponse<TemplateResponse>> getTemplate(
      @PathVariable String templateType) {
    TemplateType type = TemplateType.valueOf(templateType.toUpperCase());
    return ResponseEntity.ok(
        ApiResponse.of(TemplateResponse.from(templateService.getByType(type))));
  }
}
