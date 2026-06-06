package com.smoodee.manitto.repository;

import com.smoodee.manitto.domain.ManittoParticipant;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ManittoParticipantRepository extends JpaRepository<ManittoParticipant, Long> {

  List<ManittoParticipant> findAllByRoomId(Long roomId);

  Optional<ManittoParticipant> findByRoomIdAndUserId(Long roomId, Long userId);

  boolean existsByRoomIdAndUserId(Long roomId, Long userId);

  List<ManittoParticipant> findAllByUserId(Long userId);

  void deleteAllByRoomId(Long roomId);

  void deleteByRoomIdAndUserId(Long roomId, Long userId);
}
