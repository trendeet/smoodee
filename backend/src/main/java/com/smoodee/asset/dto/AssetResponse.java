package com.smoodee.asset.dto;

import com.smoodee.asset.domain.Asset;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class AssetResponse {

  private final Long id;
  private final Long projectId;
  private final String type;
  private final String mime;
  private final Long sizeBytes;
  private final Integer width;
  private final Integer height;
  private final Integer durationSec;
  private final String url;

  public static AssetResponse from(Asset asset) {
    return AssetResponse.builder()
        .id(asset.getId())
        .projectId(asset.getProjectId())
        .type(asset.getType().name())
        .mime(asset.getMime())
        .sizeBytes(asset.getSizeBytes())
        .width(asset.getWidth())
        .height(asset.getHeight())
        .durationSec(asset.getDurationSec())
        .build();
  }

  public static AssetResponse from(Asset asset, String url) {
    return AssetResponse.builder()
        .id(asset.getId())
        .projectId(asset.getProjectId())
        .type(asset.getType().name())
        .mime(asset.getMime())
        .sizeBytes(asset.getSizeBytes())
        .width(asset.getWidth())
        .height(asset.getHeight())
        .durationSec(asset.getDurationSec())
        .url(url)
        .build();
  }
}
