package com.smoodee.notification.repository;

import com.smoodee.notification.domain.UserNotification;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserNotificationRepository extends JpaRepository<UserNotification, Long> {

  @Query(
      "SELECT n FROM UserNotification n WHERE n.userId = :userId AND (:cursor IS NULL OR n.id < :cursor) ORDER BY n.id DESC")
  List<UserNotification> findByUserIdWithCursor(
      @Param("userId") Long userId, @Param("cursor") Long cursor, Pageable pageable);

  @Modifying
  @Query(
      "UPDATE UserNotification n SET n.read = true WHERE n.userId = :userId AND n.read = false") // JPQL uses field name, not column name
  void markAllRead(@Param("userId") Long userId);
}
