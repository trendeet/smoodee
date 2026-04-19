package com.smoodee.slot.repository;

import com.smoodee.slot.domain.Slot;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SlotRepository extends JpaRepository<Slot, Long> {

  List<Slot> findByGroupIdOrderByOrderIndex(Long groupId);

  int countByGroupId(Long groupId);
}
