package com.smoodee.manitto.domain;

import com.smoodee.global.entity.BaseTimeEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(
    name = "manitto_items",
    indexes = {
      @Index(name = "idx_manitto_item_room_owner", columnList = "roomId,ownerUserId"),
      @Index(name = "idx_manitto_item_room", columnList = "roomId")
    })
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ManittoItem extends BaseTimeEntity {

  @Column(nullable = false)
  private Long roomId;

  @Column(nullable = false)
  private Long ownerUserId;

  @Column(nullable = false)
  private Long fromUserId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private ManittoItemType itemType;

  @Column(nullable = false)
  private int skin = 0;

  @Column(nullable = false, length = 500)
  private String content;

  @Column(nullable = false)
  private int posX = 0;

  @Column(nullable = false)
  private int posY = 0;

  @Column(nullable = false)
  private boolean isOpened = false;

  @Column(nullable = false)
  private boolean inLocker = false;

  @Builder
  public ManittoItem(
      Long roomId,
      Long ownerUserId,
      Long fromUserId,
      ManittoItemType itemType,
      int skin,
      String content,
      int posX,
      int posY) {
    this.roomId = roomId;
    this.ownerUserId = ownerUserId;
    this.fromUserId = fromUserId;
    this.itemType = itemType;
    this.skin = skin;
    this.content = content;
    this.posX = posX;
    this.posY = posY;
    this.isOpened = false;
  }

  public void open() {
    this.isOpened = true;
  }

  public void storeInLocker() {
    this.isOpened = true;
    this.inLocker = true;
  }
}
