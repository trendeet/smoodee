package com.smoodee.manitto.dto;

import lombok.Getter;

@Getter
public class CreateRoomRequest {

  private String endDate; // ISO 8601 string

  private String roomName; // nullable
}
