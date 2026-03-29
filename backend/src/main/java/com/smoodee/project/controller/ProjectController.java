package com.smoodee.project.controller;

import com.smoodee.global.dto.ApiResponse;
import com.smoodee.global.security.CustomUserDetails;
import com.smoodee.group.repository.GroupMemberRepository;
import com.smoodee.group.repository.GroupRepository;
import com.smoodee.personal.service.ColorworkService;
import com.smoodee.project.domain.ProjectType;
import com.smoodee.project.dto.ProjectResponse;
import com.smoodee.project.service.ProjectService;
import com.smoodee.template.domain.TemplateType;
import io.swagger.v3.oas.annotations.Operation;
import lombok.extern.slf4j.Slf4j;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@Tag(name = "Project", description = "진행중/완료 프로젝트 API")
@RestController
@RequestMapping("/api/v1/projects")
@RequiredArgsConstructor
public class ProjectController {

  private final ProjectService projectService;
  private final ColorworkService colorworkService;
  private final GroupRepository groupRepository;
  private final GroupMemberRepository groupMemberRepository;

  @Operation(
      summary = "프로젝트 목록 조회",
      description = "type(PERSONAL|GROUP), tab(IN_PROGRESS|RECENT) 필터")
  @GetMapping
  public ResponseEntity<ApiResponse<List<ProjectResponse>>> listProjects(
      @AuthenticationPrincipal CustomUserDetails principal,
      @RequestParam(required = false) String type,
      @RequestParam(defaultValue = "IN_PROGRESS") String tab) {
    ProjectType projectType = (type != null) ? ProjectType.valueOf(type.toUpperCase()) : null;
    List<ProjectResponse> result;
    if ("RECENT".equalsIgnoreCase(tab)) {
      result =
          projectService.listRecent(principal.getUserId(), projectType).stream()
              .map(
                  project -> {
                    try {
                      if (project.getTemplateType() == TemplateType.COLORWORK) {
                        int[] progress = colorworkService.getFrameProgress(project.getId());
                        String thumbnailUrl =
                            colorworkService.getThumbnailUrl(project.getId(), principal.getUserId());
                        String paletteColor = colorworkService.getPaletteColor(project.getId());
                        return ProjectResponse.from(
                            project, progress[0], progress[1], thumbnailUrl, paletteColor,
                            colorworkService.getAllFrameUrls(project.getId(), principal.getUserId()));
                      }
                      if (project.getTemplateType() == TemplateType.DAYSHARE) {
                        return groupRepository
                            .findByProjectId(project.getId())
                            .map(
                                group -> {
                                  int memberCount =
                                      groupMemberRepository.countByGroupId(group.getId());
                                  return ProjectResponse.from(
                                      project, group.getId(), group.getName(), memberCount);
                                })
                            .orElseGet(() -> ProjectResponse.from(project));
                      }
                    } catch (Exception e) {
                      log.warn("Failed to enrich recent project {}: {}", project.getId(), e.getMessage());
                    }
                    return ProjectResponse.from(project);
                  })
              .collect(Collectors.toList());
    } else {
      result =
          projectService.listInProgress(principal.getUserId(), projectType).stream()
              .map(
                  project -> {
                    if (project.getTemplateType() == TemplateType.COLORWORK) {
                      int[] progress = colorworkService.getFrameProgress(project.getId());
                      String thumbnailUrl =
                          colorworkService.getThumbnailUrl(project.getId(), principal.getUserId());
                      String paletteColor = colorworkService.getPaletteColor(project.getId());
                      return ProjectResponse.from(
                          project, progress[0], progress[1], thumbnailUrl, paletteColor,
                          colorworkService.getAllFrameUrls(project.getId(), principal.getUserId()));
                    }
                    if (project.getTemplateType() == TemplateType.DAYSHARE) {
                      return groupRepository
                          .findByProjectId(project.getId())
                          .map(
                              group -> {
                                int memberCount =
                                    groupMemberRepository.countByGroupId(group.getId());
                                return ProjectResponse.from(
                                    project, group.getId(), group.getName(), memberCount);
                              })
                          .orElseGet(() -> ProjectResponse.from(project));
                    }
                    return ProjectResponse.from(project);
                  })
              .collect(Collectors.toList());
    }
    return ResponseEntity.ok(ApiResponse.of(result));
  }

  @Operation(summary = "프로젝트 상세 조회")
  @GetMapping("/{projectId}")
  public ResponseEntity<ApiResponse<ProjectResponse>> getProject(
      @AuthenticationPrincipal CustomUserDetails principal, @PathVariable Long projectId) {
    return ResponseEntity.ok(
        ApiResponse.of(
            ProjectResponse.from(
                projectService.getProjectWithOwnerCheck(projectId, principal.getUserId()))));
  }

  @Operation(summary = "프로젝트 제목 수정")
  @PatchMapping("/{projectId}/title")
  public ResponseEntity<ApiResponse<ProjectResponse>> updateTitle(
      @AuthenticationPrincipal CustomUserDetails principal,
      @PathVariable Long projectId,
      @RequestBody java.util.Map<String, String> body) {
    String title = body.get("title");
    return ResponseEntity.ok(
        ApiResponse.of(
            ProjectResponse.from(
                projectService.updateTitle(projectId, principal.getUserId(), title))));
  }

  @Operation(summary = "프로젝트 삭제")
  @DeleteMapping("/{projectId}")
  public ResponseEntity<Void> deleteProject(
      @AuthenticationPrincipal CustomUserDetails principal, @PathVariable Long projectId) {
    projectService.deleteProject(projectId, principal.getUserId());
    return ResponseEntity.noContent().build();
  }
}
