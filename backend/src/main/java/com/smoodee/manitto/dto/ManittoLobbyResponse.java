package com.smoodee.manitto.dto;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Builder
@Getter
@AllArgsConstructor
public class ManittoLobbyResponse {

  private String roomCode;

  private String endDate;

  private String myTargetName; // name of person I'm manitto of

  private Long myTargetUserId;

  private List<ManittoParticipantInfo> participants;

  private List<ManittoItemResponse> myLockerItems; // items in MY room
}
