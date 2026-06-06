package com.smoodee.manitto.repository;

import com.smoodee.manitto.domain.ManittoRoom;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ManittoRoomRepository extends JpaRepository<ManittoRoom, Long> {

  Optional<ManittoRoom> findByRoomCode(String roomCode);
}
