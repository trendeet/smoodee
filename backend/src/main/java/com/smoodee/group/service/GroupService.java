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
import com.smoodee.storage.service.StorageService;
import com.smoodee.template.domain.TemplateType;
import java.io.IOException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

@Slf4j
@Service
@RequiredArgsConstructor
public class GroupService {

  private static final String INVITE_CODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  private static final int INVITE_CODE_LENGTH = 8;
  private static final int MAX_RETRY = 5;
  private static final int MAX_MEMBERS = 8;

  private final GroupRepository groupRepository;
  private final GroupMemberRepository groupMemberRepository;
  private final ProjectService projectService;
  private final StorageService storageService;
  private final GroupSseService groupSseService;

  @Transactional
  public Group createGroup(Long userId, String name) {
    Project project =
        Project.builder()
            .userId(userId)
            .title(name)
            .type(ProjectType.GROUP)
            .templateType(TemplateType.DAYSHARE)
            .status(ProjectStatus.CREATED)
            .expiresAt(LocalDateTime.now().plusDays(14))
            .build();
    project = projectService.save(project);

    String inviteCode = generateUniqueInviteCode();
    Group group =
        Group.builder().projectId(project.getId()).name(name).inviteCode(inviteCode).build();
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
    if (currentCount >= MAX_MEMBERS) {
      throw new BusinessException(ErrorCode.GROUP_FULL);
    }

    GroupMember member =
        GroupMember.builder()
            .groupId(group.getId())
            .userId(userId)
            .role(GroupMemberRole.MEMBER)
            .build();
    groupMemberRepository.save(member);

    Long groupId = group.getId();
    TransactionSynchronizationManager.registerSynchronization(
        new TransactionSynchronization() {
          @Override
          public void afterCommit() {
            groupSseService.notifyMemberChanged(groupId);
          }
        });

    return group;
  }

  @Transactional(readOnly = true)
  public Group getGroup(Long groupId) {
    return groupRepository
        .findById(groupId)
        .orElseThrow(() -> new NotFoundException(ErrorCode.GROUP_NOT_FOUND));
  }

  @Transactional(readOnly = true)
  public Group getGroupByInviteCode(String inviteCode) {
    return groupRepository
        .findByInviteCode(inviteCode)
        .orElseThrow(() -> new BusinessException(ErrorCode.INVALID_INVITE_CODE));
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

  @Transactional
  public void leaveGroup(Long groupId, Long userId) {
    GroupMember member =
        groupMemberRepository
            .findByGroupIdAndUserId(groupId, userId)
            .orElseThrow(() -> new ForbiddenException(ErrorCode.GROUP_ACCESS_DENIED));
    if (member.getRole() == GroupMemberRole.OWNER) {
      throw new BusinessException(ErrorCode.GROUP_OWNER_CANNOT_LEAVE);
    }
    groupMemberRepository.delete(member);

    TransactionSynchronizationManager.registerSynchronization(
        new TransactionSynchronization() {
          @Override
          public void afterCommit() {
            groupSseService.notifyMemberChanged(groupId);
          }
        });
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

  @Transactional
  public void archiveGroup(Long groupId, Long userId) {
    requireMember(groupId, userId);
    Group group = getGroup(groupId);
    Project project = projectService.getProject(group.getProjectId());
    project.transitionTo(ProjectStatus.DONE);
    projectService.save(project);
  }

  @Transactional
  public String uploadCoverImage(Long groupId, Long userId, MultipartFile file) {
    requireMember(groupId, userId);
    Group group = getGroup(groupId);
    try {
      String original = file.getOriginalFilename();
      String ext =
          (original != null && original.contains("."))
              ? original.substring(original.lastIndexOf("."))
              : "";
      String key = "groups/" + groupId + "/cover/" + UUID.randomUUID() + ext;
      storageService.put(file.getInputStream(), key, file.getContentType(), file.getSize());
      group.updateCoverImage(key);
      groupRepository.save(group);
      return storageService.presignGet(key, Duration.ofDays(7));
    } catch (IOException e) {
      throw new BusinessException(ErrorCode.FILE_UPLOAD_FAILED);
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
