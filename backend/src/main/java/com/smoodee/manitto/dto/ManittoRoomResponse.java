package com.smoodee.manitto.dto;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Builder
@Getter
@AllArgsConstructor
public class ManittoRoomResponse {

  private String roomCode;

  private String roomName;

  private Long hostUserId;

  private String status; // "SETUP" | "ACTIVE" | "FINISHED"

  private String endDate; // ISO string

  private List<ManittoParticipantInfo> participants;
}
