package com.smoodee.personal.repository;

import com.smoodee.personal.domain.PersonalFrame;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PersonalFrameRepository extends JpaRepository<PersonalFrame, Long> {

  List<PersonalFrame> findByProjectIdOrderByFrameIndex(Long projectId);

  Optional<PersonalFrame> findByProjectIdAndFrameIndex(Long projectId, int frameIndex);

  void deleteByProjectId(Long projectId);
}
