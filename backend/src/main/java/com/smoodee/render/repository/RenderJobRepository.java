package com.smoodee.render.repository;

import com.smoodee.render.domain.RenderJob;
import com.smoodee.render.domain.RenderJobStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RenderJobRepository extends JpaRepository<RenderJob, Long> {

  Optional<RenderJob> findTopByProjectIdAndStatusOrderByCreatedAtDesc(
      Long projectId, RenderJobStatus status);

  Optional<RenderJob> findTopByProjectIdOrderByCreatedAtDesc(Long projectId);

  List<RenderJob> findByStatus(RenderJobStatus status);
}
