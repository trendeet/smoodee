package com.smoodee.scrap.repository;

import com.smoodee.scrap.domain.UserScrap;
import com.smoodee.template.domain.TemplateType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserScrapRepository extends JpaRepository<UserScrap, Long> {

  Optional<UserScrap> findByUserIdAndTemplateType(Long userId, TemplateType templateType);

  List<UserScrap> findByUserId(Long userId);

  boolean existsByUserIdAndTemplateType(Long userId, TemplateType templateType);
}
