package com.smoodee.personal.repository;

import com.smoodee.personal.domain.PersonalColorworkConfig;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PersonalColorworkConfigRepository
    extends JpaRepository<PersonalColorworkConfig, Long> {

  Optional<PersonalColorworkConfig> findByProjectId(Long projectId);
}
