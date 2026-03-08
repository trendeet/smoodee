package com.smoodee.slot.repository;

import com.smoodee.slot.domain.SlotUpload;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SlotUploadRepository extends JpaRepository<SlotUpload, Long> {

  Optional<SlotUpload> findBySlotIdAndUserId(Long slotId, Long userId);

  List<SlotUpload> findBySlotId(Long slotId);

  List<SlotUpload> findBySlotIdIn(List<Long> slotIds);
}
