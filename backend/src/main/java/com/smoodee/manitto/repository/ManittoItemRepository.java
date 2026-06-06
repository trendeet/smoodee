package com.smoodee.manitto.repository;

import com.smoodee.manitto.domain.ManittoItem;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ManittoItemRepository extends JpaRepository<ManittoItem, Long> {

  List<ManittoItem> findAllByRoomIdAndOwnerUserId(Long roomId, Long ownerUserId);

  List<ManittoItem> findAllByRoomIdAndOwnerUserIdOrderByCreatedAtDesc(Long roomId, Long ownerUserId);

  List<ManittoItem> findAllByRoomId(Long roomId);

  int countByRoomIdAndOwnerUserIdAndFromUserId(Long roomId, Long ownerUserId, Long fromUserId);

  void deleteAllByRoomId(Long roomId);
}
