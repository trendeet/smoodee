package com.smoodee.personal.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "personal_colorwork_configs")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PersonalColorworkConfig {

  @Id private Long projectId;

  @Column(length = 100)
  private String paletteSeed;

  @Column(columnDefinition = "TEXT")
  private String selectedPaletteJson;

  @Enumerated(EnumType.STRING)
  @Column(length = 5)
  private GridType gridType;

  @Column(nullable = false)
  private boolean howtoSeen;

  @Column(length = 300)
  private String thumbnailS3Key;

  @Column(length = 20)
  private String frameColor;

  @Column(length = 10)
  private String frameThickness;

  @Column(length = 10)
  private String cornerStyle;

  @Builder
  public PersonalColorworkConfig(Long projectId) {
    this.projectId = projectId;
    this.howtoSeen = false;
  }

  public void updateThumbnailKey(String s3Key) {
    this.thumbnailS3Key = s3Key;
  }

  public void markHowtoSeen() {
    this.howtoSeen = true;
  }

  public void updatePalette(String seed, String paletteJson) {
    this.paletteSeed = seed;
    this.selectedPaletteJson = paletteJson;
  }

  public void selectGrid(GridType gridType) {
    this.gridType = gridType;
  }

  public void updateFrameStyle(String frameColor, String frameThickness, String cornerStyle) {
    this.frameColor = frameColor;
    this.frameThickness = frameThickness;
    this.cornerStyle = cornerStyle;
  }
}
