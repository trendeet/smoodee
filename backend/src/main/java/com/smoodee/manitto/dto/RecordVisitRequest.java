package com.smoodee.manitto.dto;

import lombok.Getter;

@Getter
public class RecordVisitRequest {
  private Long targetUserId;
  private int posX;
  private int posY;
}
