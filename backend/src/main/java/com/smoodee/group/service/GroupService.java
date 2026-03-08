package com.smoodee.group.service;

import com.smoodee.global.exception.BusinessException;
import com.smoodee.global.exception.ErrorCode;
import com.smoodee.global.exception.ForbiddenException;
import com.smoodee.global.exception.NotFoundException;
import com.smoodee.group.domain.Group;
import com.smoodee.group.domain.GroupMember;
import com.smoodee.group.domain.GroupMemberRole;
import com.smoodee.group.repository.GroupMemberRepository;
import com.smoodee.group.repository.GroupRepository;
import com.smoodee.project.domain.Project;
import com.smoodee.project.domain.ProjectStatus;
import com.smoodee.project.domain.ProjectType;
import com.smoodee.project.service.ProjectService;
import com.smoodee.template.domain.TemplateType;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class GroupService {

  private static final String INVITE_CODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  private static final int INVITE_CODE_LENGTH = 8;
  private static final int MAX_RETRY = 5;

  private final GroupRepository groupRepository;
  private final GroupMemberRepository groupMemberRepository;
  private final ProjectService projectService;

  @Transactional
  public Group createGroup(Long userId, String name, int memberCount) {
    Project project =
        Project.builder()
            .userId(userId)
            .type(ProjectType.GROUP)
            .templateType(TemplateType.DAYSHARE)
            .status(ProjectStatus.CREATED)
            .expiresAt(LocalDateTime.now().plusDays(14))
            .build();
    project = projectService.save(project);

    String inviteCode = generateUniqueInviteCode();
    Group group =
        Group.builder()
            .projectId(project.getId())
            .name(name)
            .memberCount(memberCount)
            .inviteCode(inviteCode)
            .build();
    group = groupRepository.save(group);

    GroupMember owner =
        GroupMember.builder()
            .groupId(group.getId())
            .userId(userId)
            .role(GroupMemberRole.OWNER)
            .build();
    groupMemberRepository.save(owner);

    return group;
  }

  @Transactional
  public Group joinGroup(Long userId, String inviteCode) {
    Group group =
        groupRepository
            .findByInviteCode(inviteCode)
            .orElseThrow(() -> new BusinessException(ErrorCode.INVALID_INVITE_CODE));

    if (groupMemberRepository.existsByGroupIdAndUserId(group.getId(), userId)) {
      throw new BusinessException(ErrorCode.ALREADY_GROUP_MEMBER);
    }

    int currentCount = groupMemberRepository.countByGroupId(group.getId());
    if (currentCount >= group.getMemberCount()) {
      throw new BusinessException(ErrorCode.GROUP_FULL);
    }

    GroupMember member =
        GroupMember.builder()
            .groupId(group.getId())
            .userId(userId)
            .role(GroupMemberRole.MEMBER)
            .build();
    groupMemberRepository.save(member);

    return group;
  }

  @Transactional(readOnly = true)
  public Group getGroup(Long groupId) {
    return groupRepository
        .findById(groupId)
        .orElseThrow(() -> new NotFoundException(ErrorCode.GROUP_NOT_FOUND));
  }

  @Transactional(readOnly = true)
  public List<GroupMember> getMembers(Long groupId) {
    return groupMemberRepository.findByGroupId(groupId);
  }

  public void requireMember(Long groupId, Long userId) {
    if (!groupRepository.existsById(groupId)) {
      throw new NotFoundException(ErrorCode.GROUP_NOT_FOUND);
    }
    if (!groupMemberRepository.existsByGroupIdAndUserId(groupId, userId)) {
      throw new ForbiddenException(ErrorCode.GROUP_ACCESS_DENIED);
    }
  }

  public void requireOwner(Long groupId, Long userId) {
    if (!groupRepository.existsById(groupId)) {
      throw new NotFoundException(ErrorCode.GROUP_NOT_FOUND);
    }
    GroupMember member =
        groupMemberRepository
            .findByGroupIdAndUserId(groupId, userId)
            .orElseThrow(() -> new ForbiddenException(ErrorCode.GROUP_ACCESS_DENIED));
    if (member.getRole() != GroupMemberRole.OWNER) {
      throw new ForbiddenException(ErrorCode.GROUP_OWNER_REQUIRED);
    }
  }

  private String generateUniqueInviteCode() {
    SecureRandom random = new SecureRandom();
    for (int attempt = 0; attempt < MAX_RETRY; attempt++) {
      StringBuilder sb = new StringBuilder();
      for (int i = 0; i < INVITE_CODE_LENGTH; i++) {
        sb.append(INVITE_CODE_CHARS.charAt(random.nextInt(INVITE_CODE_CHARS.length())));
      }
      String code = sb.toString();
      if (!groupRepository.findByInviteCode(code).isPresent()) {
        return code;
      }
    }
    throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR);
  }
}
