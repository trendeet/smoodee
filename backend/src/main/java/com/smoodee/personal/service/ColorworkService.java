package com.smoodee.personal.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smoodee.asset.service.AssetService;
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
import com.smoodee.storage.service.StorageService;
import com.smoodee.template.domain.TemplateType;
import java.io.IOException;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Slf4j
@Service
@RequiredArgsConstructor
public class ColorworkService {

  private final ProjectService projectService;
  private final PersonalColorworkConfigRepository configRepository;
  private final PersonalFrameRepository frameRepository;
  private final AssetService assetService;
  private final ObjectMapper objectMapper;
  private final StorageService storageService;

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
  public void completeProject(Long projectId, Long userId) {
    Project project = projectService.getProject(projectId);
    if (userId != null) projectService.requireOwner(project, userId);
    project.transitionTo(ProjectStatus.DONE);
    projectService.save(project);
  }

  public void markHowtoSeen(Long projectId, Long userId) {
    Project project = projectService.getProject(projectId);
    if (userId != null) projectService.requireOwner(project, userId);
    PersonalColorworkConfig config = getConfig(projectId);
    config.markHowtoSeen();
  }

  @Transactional
  public PaletteShuffleResponse shufflePalette(Long projectId, Long userId) {
    Project project = projectService.getProject(projectId);
    if (userId != null) projectService.requireOwner(project, userId);

    long base = System.currentTimeMillis();
    List<PaletteShuffleResponse.PaletteEntry> palettes = new ArrayList<>();
    for (int i = 0; i < 3; i++) {
      String seed = base + "-" + i;
      palettes.add(new PaletteShuffleResponse.PaletteEntry(seed, generatePalette(seed)));
    }

    PersonalColorworkConfig config = getConfig(projectId);
    config.updatePalette(palettes.get(0).getSeed(), null);

    return new PaletteShuffleResponse(palettes);
  }

  @Transactional
  public void selectPalette(Long projectId, Long userId, String seed, List<String> colors) {
    Project project = projectService.getProject(projectId);
    if (userId != null) projectService.requireOwner(project, userId);

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
    if (userId != null) projectService.requireOwner(project, userId);

    PersonalColorworkConfig config = getConfig(projectId);
    config.selectGrid(gridType);
    project.transitionTo(ProjectStatus.UPLOADING);
    frameRepository.deleteByProjectId(projectId);
  }

  @Transactional
  public void saveFrameStyle(
      Long projectId, Long userId, String frameColor, String frameThickness, String cornerStyle) {
    Project project = projectService.getProject(projectId);
    if (userId != null) projectService.requireOwner(project, userId);
    PersonalColorworkConfig config = getConfig(projectId);
    config.updateFrameStyle(frameColor, frameThickness, cornerStyle);
  }

  @Transactional
  public void bindFrame(Long projectId, Long userId, int frameIndex, Long assetId) {
    Project project = projectService.getProject(projectId);
    if (userId != null) projectService.requireOwner(project, userId);

    PersonalColorworkConfig config = getConfig(projectId);
    if (config.getGridType() == null) {
      throw new BusinessException(ErrorCode.GRID_TYPE_NOT_SELECTED);
    }

    int maxIndex =
        switch (config.getGridType()) {
          case G2, G2_GRID -> 3;
          case G6, G6_GRID -> 5;
          case G3, G3_GRID -> 8;
        };
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
    if (userId != null) projectService.requireOwner(project, userId);

    PersonalColorworkConfig config = getConfig(projectId);
    List<PersonalFrame> frames = frameRepository.findByProjectIdOrderByFrameIndex(projectId);

    Map<Long, String> assetUrlMap =
        frames.stream()
            .filter(f -> f.getAssetId() != null)
            .collect(
                Collectors.toMap(
                    PersonalFrame::getAssetId,
                    f -> assetService.generateDownloadUrl(f.getAssetId(), userId)));

    return ColorworkStateResponse.of(config, frames, assetUrlMap);
  }

  @Transactional(readOnly = true)
  public int[] getFrameProgress(Long projectId) {
    return configRepository
        .findByProjectId(projectId)
        .map(
            config -> {
              int total =
                  config.getGridType() == null
                      ? 0
                      : switch (config.getGridType()) {
                        case G2, G2_GRID -> 4;
                        case G6, G6_GRID -> 6;
                        case G3, G3_GRID -> 9;
                      };
              int filled =
                  (int)
                      frameRepository.findByProjectIdOrderByFrameIndex(projectId).stream()
                          .filter(f -> f.getAssetId() != null)
                          .count();
              return new int[] {filled, total};
            })
        .orElse(new int[] {0, 0});
  }

  @Transactional(readOnly = true)
  public String getPaletteColor(Long projectId) {
    return configRepository
        .findByProjectId(projectId)
        .map(
            config -> {
              String json = config.getSelectedPaletteJson();
              if (json == null) return null;
              try {
                List<String> colors =
                    objectMapper.readValue(
                        json,
                        objectMapper
                            .getTypeFactory()
                            .constructCollectionType(List.class, String.class));
                if (colors == null || colors.isEmpty()) return null;
                return colors.get(colors.size() / 2);
              } catch (Exception e) {
                return null;
              }
            })
        .orElse(null);
  }

  @Transactional(readOnly = true)
  public String getGridType(Long projectId) {
    return configRepository
        .findByProjectId(projectId)
        .map(config -> config.getGridType() != null ? config.getGridType().name() : null)
        .orElse(null);
  }

  @Transactional
  public void storeThumbnail(Long projectId, Long userId, MultipartFile file) {
    Project project = projectService.getProject(projectId);
    if (userId != null) projectService.requireOwner(project, userId);
    PersonalColorworkConfig config = getConfig(projectId);
    String s3Key = String.format("thumbnails/%d/thumbnail.png", projectId);
    try {
      storageService.put(file.getInputStream(), s3Key, "image/png", file.getSize());
    } catch (IOException e) {
      throw new BusinessException(ErrorCode.INVALID_INPUT);
    }
    config.updateThumbnailKey(s3Key);
  }

  @Transactional(readOnly = true)
  public String getThumbnailUrl(Long projectId, Long userId) {
    return configRepository
        .findByProjectId(projectId)
        .filter(c -> c.getThumbnailS3Key() != null)
        .map(c -> storageService.presignGet(c.getThumbnailS3Key(), Duration.ofDays(7)))
        .orElseGet(
            () ->
                frameRepository.findByProjectIdOrderByFrameIndex(projectId).stream()
                    .filter(f -> f.getAssetId() != null)
                    .findFirst()
                    .map(f -> assetService.generateDownloadUrl(f.getAssetId(), userId))
                    .orElse(null));
  }

  @Transactional(readOnly = true)
  public List<String> getAllFrameUrls(Long projectId, Long userId) {
    return frameRepository.findByProjectIdOrderByFrameIndex(projectId).stream()
        .filter(f -> f.getAssetId() != null)
        .map(f -> assetService.generateDownloadUrl(f.getAssetId(), userId))
        .collect(Collectors.toList());
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
