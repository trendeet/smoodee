package com.smoodee.manitto.dto;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Builder
@Getter
@AllArgsConstructor
public class ManittoResultResponse {

  private String realManittoName;

  private String realManittoAvatarColor;

  private Long guessedUserId; // null if no deduction

  private String guessedUserName; // null if no deduction

  private boolean isCorrect; // false if no deduction

  private String myGuessReason; // null if no deduction

  private List<ManittoGuessInfo> othersGuesses; // people who guessed me

  private List<ManittoPairResult> allPairs; // all manitto-manitti pairs in the room
}
