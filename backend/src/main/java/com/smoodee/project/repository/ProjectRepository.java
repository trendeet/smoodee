package com.smoodee.project.repository;

import com.smoodee.project.domain.Project;
import com.smoodee.project.domain.ProjectStatus;
import com.smoodee.project.domain.ProjectType;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProjectRepository extends JpaRepository<Project, Long> {

  @Query(
      "SELECT p FROM Project p WHERE p.userId = :userId "
          + "AND (:type IS NULL OR p.type = :type) "
          + "AND p.status IN :statuses "
          + "ORDER BY p.updatedAt DESC")
  List<Project> findByUserIdAndTypeAndStatuses(
      @Param("userId") Long userId,
      @Param("type") ProjectType type,
      @Param("statuses") List<ProjectStatus> statuses);

  // 내가 멤버로 속한 그룹의 프로젝트 조회 (GROUP 타입, 멤버십 기반)
  @Query(
      "SELECT p FROM Project p "
          + "WHERE p.type = com.smoodee.project.domain.ProjectType.GROUP "
          + "AND p.status IN :statuses "
          + "AND EXISTS ("
          + "  SELECT gm FROM com.smoodee.group.domain.GroupMember gm "
          + "  JOIN com.smoodee.group.domain.Group g ON g.id = gm.groupId "
          + "  WHERE g.projectId = p.id AND gm.userId = :userId"
          + ") "
          + "ORDER BY p.updatedAt DESC")
  List<Project> findGroupProjectsByMembership(
      @Param("userId") Long userId,
      @Param("statuses") List<ProjectStatus> statuses);

  @Query("SELECT p FROM Project p WHERE p.expiresAt < :now AND p.status NOT IN ('DONE', 'EXPIRED')")
  List<Project> findExpiredProjects(@Param("now") LocalDateTime now);
}
