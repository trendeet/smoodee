package com.smoodee.manitto.repository;

import com.smoodee.manitto.domain.ManittoVisit;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ManittoVisitRepository extends JpaRepository<ManittoVisit, Long> {

  List<ManittoVisit> findAllByRoomIdAndTargetUserIdAndCreatedAtAfter(
      Long roomId, Long targetUserId, LocalDateTime after);

  List<ManittoVisit> findAllByRoomIdAndTargetUserIdOrderByCreatedAtDesc(
      Long roomId, Long targetUserId);

  int countByRoomIdAndVisitorUserIdAndTargetUserId(Long roomId, Long visitorUserId, Long targetUserId);

  void deleteAllByRoomId(Long roomId);
}
