package com.smoodee.personal.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smoodee.global.exception.BusinessException;
import com.smoodee.global.exception.ErrorCode;
import com.smoodee.global.exception.NotFoundException;
import com.smoodee.personal.domain.GridType;
import com.smoodee.personal.domain.PersonalColorworkConfig;
import com.smoodee.personal.domain.PersonalFrame;
import com.smoodee.personal.dto.ColorworkStateResponse;
import com.smoodee.personal.dto.PaletteShuffleResponse;
import com.smoodee.personal.repository.PersonalColorworkConfigRepository;
import com.smoodee.personal.repository.PersonalFrameRepository;
import com.smoodee.project.domain.Project;
import com.smoodee.project.domain.ProjectStatus;
import com.smoodee.project.domain.ProjectType;
import com.smoodee.project.service.ProjectService;
import com.smoodee.template.domain.TemplateType;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class ColorworkService {

  private final ProjectService projectService;
  private final PersonalColorworkConfigRepository configRepository;
  private final PersonalFrameRepository frameRepository;
  private final ObjectMapper objectMapper;

  @Transactional
  public Project createColorworkProject(Long userId) {
    Project project =
        Project.builder()
            .userId(userId)
            .type(ProjectType.PERSONAL)
            .templateType(TemplateType.COLORWORK)
            .status(ProjectStatus.INIT)
            .expiresAt(LocalDateTime.now().plusDays(14))
            .build();
    project = projectService.save(project);

    PersonalColorworkConfig config =
        PersonalColorworkConfig.builder().projectId(project.getId()).build();
    configRepository.save(config);

    return project;
  }

  @Transactional
  public void markHowtoSeen(Long projectId, Long userId) {
    Project project = projectService.getProject(projectId);
    projectService.requireOwner(project, userId);
    PersonalColorworkConfig config = getConfig(projectId);
    config.markHowtoSeen();
  }

  @Transactional
  public PaletteShuffleResponse shufflePalette(Long projectId, Long userId) {
    Project project = projectService.getProject(projectId);
    projectService.requireOwner(project, userId);

    String seed = String.valueOf(System.currentTimeMillis());
    List<String> colors = generatePalette(seed);

    PersonalColorworkConfig config = getConfig(projectId);
    config.updatePalette(seed, null);

    return new PaletteShuffleResponse(seed, colors);
  }

  @Transactional
  public void selectPalette(Long projectId, Long userId, String seed, List<String> colors) {
    Project project = projectService.getProject(projectId);
    projectService.requireOwner(project, userId);

    PersonalColorworkConfig config = getConfig(projectId);
    try {
      String paletteJson = objectMapper.writeValueAsString(colors);
      config.updatePalette(seed, paletteJson);
    } catch (JsonProcessingException e) {
      throw new BusinessException(ErrorCode.INVALID_INPUT);
    }
  }

  @Transactional
  public void selectGrid(Long projectId, Long userId, GridType gridType) {
    Project project = projectService.getProject(projectId);
    projectService.requireOwner(project, userId);

    PersonalColorworkConfig config = getConfig(projectId);
    config.selectGrid(gridType);
    project.transitionTo(ProjectStatus.UPLOADING);
  }

  @Transactional
  public void bindFrame(Long projectId, Long userId, int frameIndex, Long assetId) {
    Project project = projectService.getProject(projectId);
    projectService.requireOwner(project, userId);

    PersonalColorworkConfig config = getConfig(projectId);
    if (config.getGridType() == null) {
      throw new BusinessException(ErrorCode.GRID_TYPE_NOT_SELECTED);
    }

    int maxIndex = (config.getGridType() == GridType.G2) ? 3 : 8;
    if (frameIndex < 0 || frameIndex > maxIndex) {
      throw new BusinessException(ErrorCode.INVALID_FRAME_INDEX);
    }

    frameRepository
        .findByProjectIdAndFrameIndex(projectId, frameIndex)
        .ifPresentOrElse(
            frame -> frame.updateAsset(assetId),
            () ->
                frameRepository.save(
                    PersonalFrame.builder()
                        .projectId(projectId)
                        .frameIndex(frameIndex)
                        .assetId(assetId)
                        .build()));
  }

  @Transactional(readOnly = true)
  public ColorworkStateResponse getState(Long projectId, Long userId) {
    Project project = projectService.getProject(projectId);
    projectService.requireOwner(project, userId);

    PersonalColorworkConfig config = getConfig(projectId);
    List<PersonalFrame> frames = frameRepository.findByProjectIdOrderByFrameIndex(projectId);
    return ColorworkStateResponse.of(config, frames);
  }

  private PersonalColorworkConfig getConfig(Long projectId) {
    return configRepository
        .findByProjectId(projectId)
        .orElseThrow(() -> new NotFoundException(ErrorCode.COLORWORK_NOT_FOUND));
  }

  private List<String> generatePalette(String seed) {
    Random random = new Random(seed.hashCode());
    List<String> colors = new ArrayList<>();
    for (int i = 0; i < 3; i++) {
      float hue = random.nextFloat();
      float saturation = 0.5f + random.nextFloat() * 0.5f;
      float brightness = 0.7f + random.nextFloat() * 0.3f;
      int rgb = java.awt.Color.HSBtoRGB(hue, saturation, brightness);
      colors.add(String.format("#%06X", (rgb & 0xFFFFFF)));
    }
    return colors;
  }
}
