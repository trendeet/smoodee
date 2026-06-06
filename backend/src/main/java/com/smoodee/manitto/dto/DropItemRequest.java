package com.smoodee.manitto.dto;

import lombok.Getter;

@Getter
public class DropItemRequest {

  private Long targetUserId;

  private String type; // "GIFT" | "MESSAGE" | "HINT"

  private int skin;

  private String content;

  private int posX;

  private int posY;
}
