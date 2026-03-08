package com.smoodee.group.repository;

import com.smoodee.group.domain.GroupMember;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GroupMemberRepository extends JpaRepository<GroupMember, Long> {

  boolean existsByGroupIdAndUserId(Long groupId, Long userId);

  int countByGroupId(Long groupId);

  List<GroupMember> findByGroupId(Long groupId);

  Optional<GroupMember> findByGroupIdAndUserId(Long groupId, Long userId);
}
