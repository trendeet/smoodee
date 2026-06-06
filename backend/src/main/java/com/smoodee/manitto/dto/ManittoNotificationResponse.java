package com.smoodee.manitto.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class ManittoNotificationResponse {
  private final long id;
  private final String text;
  private final String time;
}
