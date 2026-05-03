package com.smoodee.project.service;

import com.smoodee.global.exception.ErrorCode;
import com.smoodee.global.exception.ForbiddenException;
import com.smoodee.global.exception.NotFoundException;
import com.smoodee.project.domain.Project;
import com.smoodee.project.domain.ProjectStatus;
import com.smoodee.project.domain.ProjectType;
import com.smoodee.project.repository.ProjectRepository;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ProjectService {

  private final ProjectRepository projectRepository;

  @Transactional(readOnly = true)
  public List<Project> listInProgress(Long userId, ProjectType type) {
    List<ProjectStatus> statuses =
        Arrays.asList(
            ProjectStatus.INIT,
            ProjectStatus.UPLOADING,
            ProjectStatus.CREATED,
            ProjectStatus.SLOT_CONFIG,
            ProjectStatus.IN_PROGRESS);
    if (type == ProjectType.GROUP) {
      return projectRepository.findGroupProjectsByMembership(userId, statuses);
    }
    return projectRepository.findByUserIdAndTypeAndStatuses(userId, type, statuses);
  }

  @Transactional(readOnly = true)
  public List<Project> listRecent(Long userId, ProjectType type) {
    List<ProjectStatus> statuses = Arrays.asList(ProjectStatus.DONE, ProjectStatus.EXPIRED);
    if (type == ProjectType.GROUP) {
      return projectRepository.findGroupProjectsByMembership(userId, statuses);
    }
    if (type == ProjectType.PERSONAL) {
      return projectRepository.findByUserIdAndTypeAndStatuses(userId, type, statuses);
    }
    // type == null: 개인(소유자 기반) + 그룹(멤버십 기반) 합산
    List<Project> personal =
        projectRepository.findByUserIdAndTypeAndStatuses(userId, ProjectType.PERSONAL, statuses);
    List<Project> group = projectRepository.findGroupProjectsByMembership(userId, statuses);
    List<Project> combined = new ArrayList<>(personal);
    combined.addAll(group);
    combined.sort(Comparator.comparing(Project::getUpdatedAt).reversed());
    return combined;
  }

  @Transactional(readOnly = true)
  public Project getProject(Long projectId) {
    return projectRepository
        .findById(projectId)
        .orElseThrow(() -> new NotFoundException(ErrorCode.PROJECT_NOT_FOUND));
  }

  @Transactional(readOnly = true)
  public Project getProjectWithOwnerCheck(Long projectId, Long userId) {
    Project project = getProject(projectId);
    requireOwner(project, userId);
    return project;
  }

  @Transactional
  public Project updateTitle(Long projectId, Long userId, String title) {
    Project project = getProject(projectId);
    requireOwner(project, userId);
    project.updateTitle(title);
    return project;
  }

  @Transactional
  public void deleteProject(Long projectId, Long userId) {
    Project project = getProject(projectId);
    requireOwner(project, userId);
    projectRepository.delete(project);
  }

  @Transactional
  public Project save(Project project) {
    return projectRepository.save(project);
  }

  public void requireOwner(Project project, Long userId) {
    if (project.getUserId() == null || !project.getUserId().equals(userId)) {
      throw new ForbiddenException(ErrorCode.PROJECT_ACCESS_DENIED);
    }
  }
}
