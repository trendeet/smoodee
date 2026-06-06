package com.smoodee.manitto.repository;

import com.smoodee.manitto.domain.ManittoDeduction;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ManittoDeductionRepository extends JpaRepository<ManittoDeduction, Long> {

  Optional<ManittoDeduction> findByRoomIdAndGuesserUserId(Long roomId, Long guesserUserId);

  List<ManittoDeduction> findAllByRoomIdAndGuessedTargetUserId(
      Long roomId, Long guessedTargetUserId);

  void deleteAllByRoomId(Long roomId);
}
