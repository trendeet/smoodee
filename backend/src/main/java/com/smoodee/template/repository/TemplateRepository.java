package com.smoodee.template.repository;

import com.smoodee.template.domain.Template;
import com.smoodee.template.domain.TemplateType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TemplateRepository extends JpaRepository<Template, Long> {

  Optional<Template> findByType(TemplateType type);

  @Query(
      "SELECT t FROM Template t WHERE "
          + "(:category IS NULL OR t.category = :category) AND "
          + "(:keyword IS NULL OR t.title LIKE %:keyword% OR t.tags LIKE %:keyword% OR t.description LIKE %:keyword%)")
  List<Template> findByFilter(@Param("category") String category, @Param("keyword") String keyword);
}
