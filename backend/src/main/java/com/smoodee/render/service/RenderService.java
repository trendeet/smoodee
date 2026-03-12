package com.smoodee.render.service;

import com.smoodee.global.exception.BusinessException;
import com.smoodee.global.exception.ErrorCode;
import com.smoodee.global.exception.NotFoundException;
import com.smoodee.group.repository.GroupRepository;
import com.smoodee.project.domain.Project;
import com.smoodee.project.domain.ProjectStatus;
import com.smoodee.project.service.ProjectService;
import com.smoodee.render.domain.RenderJob;
import com.smoodee.render.domain.RenderJobStatus;
import com.smoodee.render.domain.RenderJobType;
import com.smoodee.render.repository.RenderJobRepository;
import com.smoodee.storage.service.StorageService;
import jakarta.annotation.PostConstruct;
import java.time.Duration;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Slf4j
@Service
@RequiredArgsConstructor
public class RenderService {

  private final RenderJobRepository renderJobRepository;
  private final ProjectService projectService;
  private final PersonalRenderWorker personalRenderWorker;
  private final GroupRenderWorker groupRenderWorker;
  private final GroupRepository groupRepository;
  private final StorageService storageService;

  @PostConstruct
  @Transactional
  public void recoverStaleJobs() {
    List<RenderJob> staleJobs = new java.util.ArrayList<>();
    staleJobs.addAll(renderJobRepository.findByStatus(RenderJobStatus.RUNNING));
    staleJobs.addAll(renderJobRepository.findByStatus(RenderJobStatus.QUEUED));
    staleJobs.forEach(
        job -> {
          log.warn("Recovered stale render job: jobId={}, prevStatus={}", job.getId(), job.getStatus());
          job.markFailed("서버 재기동으로 인한 렌더 중단");
        });
    renderJobRepository.saveAll(staleJobs);
  }

  @Transactional
  public RenderJob submitPersonalRender(Long projectId, Long userId) {
    Project project = projectService.getProjectWithOwnerCheck(projectId, userId);

    renderJobRepository
        .findTopByProjectIdAndStatusOrderByCreatedAtDesc(projectId, RenderJobStatus.RUNNING)
        .ifPresent(
            j -> {
              throw new BusinessException(ErrorCode.RENDER_ALREADY_RUNNING);
            });

    RenderJob job =
        RenderJob.builder().projectId(projectId).type(RenderJobType.PERSONAL_IMAGE).build();
    job = renderJobRepository.save(job);

    project.transitionTo(ProjectStatus.DONE);
    final RenderJob savedJob = job;
    TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
      @Override
      public void afterCommit() {
        personalRenderWorker.execute(savedJob);
      }
    });

    return job;
  }

  @Transactional
  public RenderJob submitGroupRender(Long groupId, Long userId) {
    // groupService를 직접 주입받지 않고 groupRepository를 통해 projectId를 얻는다
    com.smoodee.group.domain.Group group =
        groupRepository
            .findById(groupId)
            .orElseThrow(() -> new NotFoundException(ErrorCode.GROUP_NOT_FOUND));
    projectService.getProjectWithOwnerCheck(group.getProjectId(), userId);

    renderJobRepository
        .findTopByProjectIdAndStatusOrderByCreatedAtDesc(
            group.getProjectId(), RenderJobStatus.RUNNING)
        .ifPresent(
            j -> {
              throw new BusinessException(ErrorCode.RENDER_ALREADY_RUNNING);
            });

    RenderJob job =
        RenderJob.builder().projectId(group.getProjectId()).type(RenderJobType.GROUP_VIDEO).build();
    job = renderJobRepository.save(job);
    final RenderJob savedGroupJob = job;
    TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
      @Override
      public void afterCommit() {
        groupRenderWorker.execute(savedGroupJob);
      }
    });
    return job;
  }

  @Transactional
  public RenderJob retryRenderJob(Long jobId, Long userId) {
    RenderJob failedJob = getRenderJob(jobId);
    projectService.getProjectWithOwnerCheck(failedJob.getProjectId(), userId);

    if (failedJob.getStatus() != RenderJobStatus.FAILED) {
      throw new BusinessException(ErrorCode.RENDER_NOT_SUCCEEDED);
    }

    RenderJob newJob =
        RenderJob.builder().projectId(failedJob.getProjectId()).type(failedJob.getType()).build();
    newJob = renderJobRepository.save(newJob);

    final RenderJob savedNewJob = newJob;
    TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
      @Override
      public void afterCommit() {
        if (savedNewJob.getType() == RenderJobType.PERSONAL_IMAGE) {
          personalRenderWorker.execute(savedNewJob);
        } else if (savedNewJob.getType() == RenderJobType.GROUP_VIDEO) {
          groupRenderWorker.execute(savedNewJob);
        }
      }
    });

    return newJob;
  }

  @Transactional(readOnly = true)
  public RenderJob getRenderJob(Long jobId) {
    return renderJobRepository
        .findById(jobId)
        .orElseThrow(() -> new NotFoundException(ErrorCode.RENDER_JOB_NOT_FOUND));
  }

  public String getDownloadUrl(Long jobId, Long userId) {
    RenderJob job = getRenderJob(jobId);
    projectService.getProjectWithOwnerCheck(job.getProjectId(), userId);

    if (job.getStatus() != RenderJobStatus.SUCCEEDED) {
      throw new BusinessException(ErrorCode.RENDER_NOT_SUCCEEDED);
    }
    return storageService.presignGet(job.getOutputS3Key(), Duration.ofMinutes(10));
  }

  @Transactional(readOnly = true)
  public RenderJob getLatestJobByProject(Long projectId, Long userId) {
    projectService.getProjectWithOwnerCheck(projectId, userId);
    return renderJobRepository
        .findTopByProjectIdOrderByCreatedAtDesc(projectId)
        .orElseThrow(() -> new NotFoundException(ErrorCode.RENDER_JOB_NOT_FOUND));
  }

  public String getShareUrl(Long jobId, Long userId) {
    RenderJob job = getRenderJob(jobId);
    projectService.getProjectWithOwnerCheck(job.getProjectId(), userId);

    if (job.getStatus() != RenderJobStatus.SUCCEEDED) {
      throw new BusinessException(ErrorCode.RENDER_NOT_SUCCEEDED);
    }
    return storageService.presignGet(job.getOutputS3Key(), Duration.ofDays(7));
  }
}
