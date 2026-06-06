package com.smoodee.manitto.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Builder
@Getter
@AllArgsConstructor
public class ManittoItemResponse {

  private Long id;

  private String type; // "GIFT" | "MESSAGE" | "HINT"

  private int skin;

  private String content;

  private int posX;

  private int posY;

  private boolean isOpened;

  private boolean inLocker;

  private String fromName; // always "익명의 마니또"
}
