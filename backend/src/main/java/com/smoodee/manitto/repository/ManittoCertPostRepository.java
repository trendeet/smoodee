package com.smoodee.manitto.repository;

import com.smoodee.manitto.domain.CertPostStatus;
import com.smoodee.manitto.domain.ManittoCertPost;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ManittoCertPostRepository extends JpaRepository<ManittoCertPost, Long> {

  List<ManittoCertPost> findAllByRoomIdAndStatusOrderByCreatedAtDesc(
      Long roomId, CertPostStatus status);

  List<ManittoCertPost> findAllByRoomIdAndTargetUserIdAndStatus(
      Long roomId, Long targetUserId, CertPostStatus status);
}
