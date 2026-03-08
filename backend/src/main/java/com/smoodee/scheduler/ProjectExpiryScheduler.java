package com.smoodee.scheduler;

import com.smoodee.project.repository.ProjectRepository;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Component
@RequiredArgsConstructor
public class ProjectExpiryScheduler {

  private final ProjectRepository projectRepository;

  @Scheduled(cron = "0 0 3 * * *") // 매일 새벽 3시
  @Transactional
  public void expireProjects() {
    List<com.smoodee.project.domain.Project> expiredProjects =
        projectRepository.findExpiredProjects(LocalDateTime.now());
    expiredProjects.forEach(
        project -> {
          project.markExpired();
          log.info("Project expired: projectId={}", project.getId());
        });
    if (!expiredProjects.isEmpty()) {
      log.info("Expired {} projects", expiredProjects.size());
    }
  }
}
