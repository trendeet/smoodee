package com.smoodee.group.controller;

import com.smoodee.global.dto.ApiResponse;
import com.smoodee.global.security.CustomUserDetails;
import com.smoodee.group.dto.CreateGroupRequest;
import com.smoodee.group.dto.GroupMemberResponse;
import com.smoodee.group.dto.GroupResponse;
import com.smoodee.group.dto.JoinGroupRequest;
import com.smoodee.group.service.GroupService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Group", description = "그룹(DayShare) API")
@RestController
@RequestMapping("/api/v1/groups")
@RequiredArgsConstructor
public class GroupController {

  private final GroupService groupService;

  @Operation(summary = "그룹 생성")
  @PostMapping
  public ResponseEntity<ApiResponse<GroupResponse>> createGroup(
      @AuthenticationPrincipal CustomUserDetails principal,
      @Valid @RequestBody CreateGroupRequest request) {
    return ResponseEntity.ok(
        ApiResponse.of(
            GroupResponse.from(
                groupService.createGroup(
                    principal.getUserId(), request.getName(), request.getMemberCount()))));
  }

  @Operation(summary = "초대코드로 그룹 참여")
  @PostMapping("/join")
  public ResponseEntity<ApiResponse<GroupResponse>> joinGroup(
      @AuthenticationPrincipal CustomUserDetails principal,
      @Valid @RequestBody JoinGroupRequest request) {
    return ResponseEntity.ok(
        ApiResponse.of(
            GroupResponse.from(
                groupService.joinGroup(principal.getUserId(), request.getInviteCode()))));
  }

  @Operation(summary = "그룹 상세 조회")
  @GetMapping("/{groupId}")
  public ResponseEntity<ApiResponse<GroupResponse>> getGroup(
      @AuthenticationPrincipal CustomUserDetails principal, @PathVariable Long groupId) {
    groupService.requireMember(groupId, principal.getUserId());
    return ResponseEntity.ok(ApiResponse.of(GroupResponse.from(groupService.getGroup(groupId))));
  }

  @Operation(summary = "그룹 멤버 목록 조회")
  @GetMapping("/{groupId}/members")
  public ResponseEntity<ApiResponse<List<GroupMemberResponse>>> getMembers(
      @AuthenticationPrincipal CustomUserDetails principal, @PathVariable Long groupId) {
    groupService.requireMember(groupId, principal.getUserId());
    List<GroupMemberResponse> members =
        groupService.getMembers(groupId).stream()
            .map(GroupMemberResponse::from)
            .collect(Collectors.toList());
    return ResponseEntity.ok(ApiResponse.of(members));
  }
}
