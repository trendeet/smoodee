package com.smoodee.manitto.dto;

import com.smoodee.manitto.domain.ManittoVisit;
import java.time.LocalDateTime;
import lombok.Getter;

@Getter
public class ManittoVisitResponse {
  private final int posX;
  private final int posY;
  private final LocalDateTime createdAt;

  public ManittoVisitResponse(ManittoVisit visit) {
    this.posX = visit.getPosX();
    this.posY = visit.getPosY();
    this.createdAt = visit.getCreatedAt();
  }
}
