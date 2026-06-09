package com.smoodee.manitto.repository;

import com.smoodee.manitto.domain.ManittoCertLike;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ManittoCertLikeRepository extends JpaRepository<ManittoCertLike, Long> {

  boolean existsByPostIdAndUserId(Long postId, Long userId);

  void deleteByPostIdAndUserId(Long postId, Long userId);

  List<ManittoCertLike> findByPostIdIn(List<Long> postIds);
}
