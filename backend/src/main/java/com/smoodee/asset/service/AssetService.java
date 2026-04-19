package com.smoodee.asset.service;

import com.smoodee.asset.domain.Asset;
import com.smoodee.asset.domain.AssetType;
import com.smoodee.asset.repository.AssetRepository;
import com.smoodee.global.exception.BusinessException;
import com.smoodee.global.exception.ErrorCode;
import com.smoodee.global.exception.ForbiddenException;
import com.smoodee.global.exception.NotFoundException;
import com.smoodee.group.repository.GroupMemberRepository;
import com.smoodee.group.repository.GroupRepository;
import com.smoodee.project.domain.Project;
import com.smoodee.project.domain.ProjectType;
import com.smoodee.project.service.ProjectService;
import com.smoodee.storage.service.StorageService;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.io.InputStream;
import java.time.Duration;
import javax.imageio.ImageIO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Slf4j
@Service
@RequiredArgsConstructor
public class AssetService {

  private static final long MAX_IMAGE_SIZE = 10 * 1024 * 1024L; // 10MB
  private static final long MAX_VIDEO_SIZE = 50 * 1024 * 1024L; // 50MB

  private final AssetRepository assetRepository;
  private final ProjectService projectService;
  private final StorageService storageService;
  private final GroupRepository groupRepository;
  private final GroupMemberRepository groupMemberRepository;

  @Transactional
  public Asset upload(Long projectId, Long userId, MultipartFile file) {
    Project project = projectService.getProject(projectId);
    if (project.getType() == ProjectType.GROUP) {
      // 그룹 프로젝트: 그룹 멤버면 업로드 허용
      groupRepository
          .findByProjectId(projectId)
          .ifPresent(
              group -> {
                if (!groupMemberRepository.existsByGroupIdAndUserId(group.getId(), userId)) {
                  throw new ForbiddenException(ErrorCode.GROUP_ACCESS_DENIED);
                }
              });
    } else {
      if (userId != null) projectService.requireOwner(project, userId);
    }

    String mime = file.getContentType();
    AssetType assetType = determineAssetType(mime);
    validateFileSize(file.getSize(), assetType);

    Asset asset =
        Asset.builder()
            .projectId(projectId)
            .ownerUserId(userId)
            .type(assetType)
            .mime(mime)
            .sizeBytes(file.getSize())
            .build();
    asset = assetRepository.save(asset);

    String s3Key = String.format("assets/%d/%d", projectId, asset.getId());
    try (InputStream is = file.getInputStream()) {
      storageService.put(is, s3Key, mime, file.getSize());
    } catch (IOException e) {
      throw new BusinessException(ErrorCode.FILE_UPLOAD_FAILED);
    }

    asset.updateS3Key(s3Key);

    if (assetType == AssetType.IMAGE) {
      updateImageDimensions(asset, file);
    }

    return asset;
  }

  @Transactional(readOnly = true)
  public Asset getAsset(Long assetId) {
    return assetRepository
        .findById(assetId)
        .orElseThrow(() -> new NotFoundException(ErrorCode.ASSET_NOT_FOUND));
  }

  @Transactional(readOnly = true)
  public Asset getAssetWithAccessCheck(Long assetId, Long userId) {
    Asset asset = getAsset(assetId);
    if (userId != null && !userId.equals(asset.getOwnerUserId())) {
      throw new ForbiddenException(ErrorCode.ASSET_ACCESS_DENIED);
    }
    return asset;
  }

  public String generateDownloadUrl(Long assetId, Long userId) {
    Asset asset = getAssetWithAccessCheck(assetId, userId);
    if (asset.getS3Key() == null) {
      throw new NotFoundException(ErrorCode.ASSET_NOT_FOUND);
    }
    return storageService.presignGet(asset.getS3Key(), Duration.ofMinutes(10));
  }

  private AssetType determineAssetType(String mime) {
    if (mime == null) {
      throw new BusinessException(ErrorCode.INVALID_FILE_TYPE);
    }
    if (mime.startsWith("image/")) {
      return AssetType.IMAGE;
    }
    if (mime.startsWith("video/")) {
      return AssetType.VIDEO;
    }
    throw new BusinessException(ErrorCode.INVALID_FILE_TYPE);
  }

  private void validateFileSize(long size, AssetType type) {
    long maxSize = (type == AssetType.IMAGE) ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;
    if (size > maxSize) {
      throw new BusinessException(ErrorCode.FILE_TOO_LARGE);
    }
  }

  private void updateImageDimensions(Asset asset, MultipartFile file) {
    try (InputStream is = file.getInputStream()) {
      BufferedImage image = ImageIO.read(is);
      if (image != null) {
        asset.updateDimensions(image.getWidth(), image.getHeight());
      }
    } catch (IOException e) {
      log.warn("Failed to read image dimensions: assetId={}", asset.getId());
    }
  }
}
