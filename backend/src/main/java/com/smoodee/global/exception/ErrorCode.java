package com.smoodee.global.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ErrorCode {

  // Common
  INTERNAL_SERVER_ERROR("서버 오류가 발생했습니다."),
  INVALID_INPUT("잘못된 입력값입니다."),
  RESOURCE_NOT_FOUND("리소스를 찾을 수 없습니다."),

  // Auth
  UNAUTHORIZED("인증이 필요합니다."),
  INVALID_TOKEN("유효하지 않은 토큰입니다."),
  EXPIRED_TOKEN("만료된 토큰입니다."),
  INVALID_REFRESH_TOKEN("유효하지 않은 리프레시 토큰입니다."),
  REFRESH_TOKEN_EXPIRED("리프레시 토큰이 만료되었습니다."),

  // User
  USER_NOT_FOUND("사용자를 찾을 수 없습니다."),
  FORBIDDEN("접근 권한이 없습니다."),

  // Project
  PROJECT_NOT_FOUND("프로젝트를 찾을 수 없습니다."),
  PROJECT_ACCESS_DENIED("프로젝트에 접근 권한이 없습니다."),
  INVALID_PROJECT_STATUS("유효하지 않은 프로젝트 상태입니다."),

  // Asset / Upload
  ASSET_NOT_FOUND("에셋을 찾을 수 없습니다."),
  ASSET_ACCESS_DENIED("에셋에 접근 권한이 없습니다."),
  INVALID_FILE_TYPE("허용되지 않는 파일 형식입니다."),
  FILE_TOO_LARGE("파일 크기가 초과되었습니다."),
  FILE_UPLOAD_FAILED("파일 업로드에 실패했습니다."),

  // Colorwork
  COLORWORK_NOT_FOUND("컬러워크 프로젝트를 찾을 수 없습니다."),
  INVALID_FRAME_INDEX("유효하지 않은 프레임 인덱스입니다."),
  GRID_TYPE_NOT_SELECTED("그리드 타입을 먼저 선택해야 합니다."),

  // Group
  GROUP_NOT_FOUND("그룹을 찾을 수 없습니다."),
  GROUP_ACCESS_DENIED("그룹에 접근 권한이 없습니다."),
  INVALID_INVITE_CODE("유효하지 않은 초대 코드입니다."),
  GROUP_FULL("그룹 정원이 초과되었습니다."),
  ALREADY_GROUP_MEMBER("이미 그룹 멤버입니다."),
  GROUP_OWNER_REQUIRED("그룹 방장만 수행할 수 있습니다."),

  // Slot
  SLOT_NOT_FOUND("슬롯을 찾을 수 없습니다."),

  // Render
  RENDER_JOB_NOT_FOUND("렌더 작업을 찾을 수 없습니다."),
  RENDER_NOT_SUCCEEDED("완료된 렌더 작업이 아닙니다."),
  RENDER_ALREADY_RUNNING("이미 렌더 작업이 진행 중입니다."),

  // Template
  TEMPLATE_NOT_FOUND("템플릿을 찾을 수 없습니다.");

  private final String message;
}
