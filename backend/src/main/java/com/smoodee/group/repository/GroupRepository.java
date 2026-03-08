package com.smoodee.group.repository;

import com.smoodee.group.domain.Group;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GroupRepository extends JpaRepository<Group, Long> {

  Optional<Group> findByInviteCode(String inviteCode);

  Optional<Group> findByProjectId(Long projectId);
}
