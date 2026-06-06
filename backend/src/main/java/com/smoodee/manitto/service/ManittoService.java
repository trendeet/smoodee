package com.smoodee.manitto.service;

import com.smoodee.global.exception.BusinessException;
import com.smoodee.global.exception.ErrorCode;
import com.smoodee.global.exception.ForbiddenException;
import com.smoodee.global.exception.NotFoundException;
import com.smoodee.manitto.domain.ManittoDeduction;
import com.smoodee.manitto.domain.ManittoItem;
import com.smoodee.manitto.domain.ManittoItemType;
import com.smoodee.manitto.domain.ManittoParticipant;
import com.smoodee.manitto.domain.ManittoRoom;
import com.smoodee.manitto.domain.ManittoRoomStatus;
import com.smoodee.manitto.domain.ManittoVisit;
import com.smoodee.manitto.dto.CreateRoomRequest;
import com.smoodee.manitto.dto.DropItemRequest;
import com.smoodee.manitto.dto.ManittoGuessInfo;
import com.smoodee.manitto.dto.ManittoItemResponse;
import com.smoodee.manitto.dto.ManittoLobbyResponse;
import com.smoodee.manitto.dto.ManittoNotificationResponse;
import com.smoodee.manitto.dto.ManittoPairResult;
import com.smoodee.manitto.dto.ManittoParticipantInfo;
import com.smoodee.manitto.dto.ManittoResultResponse;
import com.smoodee.manitto.dto.ManittoRoomResponse;
import com.smoodee.manitto.dto.ManittoVisitResponse;
import com.smoodee.manitto.dto.RecordVisitRequest;
import com.smoodee.manitto.dto.SubmitDeductionRequest;
import com.smoodee.manitto.repository.ManittoDeductionRepository;
import com.smoodee.manitto.repository.ManittoItemRepository;
import com.smoodee.manitto.repository.ManittoParticipantRepository;
import com.smoodee.manitto.repository.ManittoRoomRepository;
import com.smoodee.manitto.repository.ManittoVisitRepository;
import com.smoodee.user.domain.User;
import com.smoodee.user.repository.UserRepository;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.Random;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Service
@RequiredArgsConstructor
@Transactional
public class ManittoService {

  private static final String[] AVATAR_COLORS = {
    "#E9967A", "#FFDAB9", "#DA70D6", "#66CDAA", "#F08080",
    "#87CEEB", "#DDA0DD", "#98FB98", "#F4A460", "#B0E0E6"
  };

  private static final String[] WALL_COLORS = {
    "#F5E6D3", "#E0F2F1", "#F3E5F5", "#E8F5E9", "#FFF3E0",
    "#E3F2FD", "#FCE4EC", "#F1F8E9", "#FFF8E1", "#E8EAF6"
  };

  private final ManittoRoomRepository roomRepository;
  private final ManittoParticipantRepository participantRepository;
  private final ManittoItemRepository itemRepository;
  private final ManittoDeductionRepository deductionRepository;
  private final ManittoVisitRepository visitRepository;
  private final UserRepository userRepository;
  private final ManittoSseService sseService;

  public ManittoRoomResponse createRoom(Long userId, CreateRoomRequest req) {
    User user =
        userRepository
            .findById(userId)
            .orElseThrow(() -> new NotFoundException(ErrorCode.USER_NOT_FOUND));

    LocalDateTime endDate = LocalDateTime.parse(req.getEndDate(), DateTimeFormatter.ISO_DATE_TIME);
    ManittoRoom room = ManittoRoom.create(userId, req.getRoomName(), endDate);
    room = roomRepository.save(room);

    ManittoParticipant host =
        ManittoParticipant.builder()
            .roomId(room.getId())
            .userId(userId)
            .userName(user.getName())
            .avatarColor(AVATAR_COLORS[0])
            .wallColor(WALL_COLORS[0])
            .isReady(true)
            .build();
    participantRepository.save(host);

    List<ManittoParticipantInfo> participants = List.of(toParticipantInfo(host));
    return toRoomResponse(room, participants);
  }

  @Transactional(readOnly = true)
  public List<ManittoRoomResponse> getMyRooms(Long userId) {
    List<ManittoParticipant> myParticipations = participantRepository.findAllByUserId(userId);
    return myParticipations.stream()
        .map(p -> roomRepository.findById(p.getRoomId()).orElse(null))
        .filter(room -> room != null && room.getStatus() != ManittoRoomStatus.FINISHED)
        .map(room -> {
          List<ManittoParticipant> participants = participantRepository.findAllByRoomId(room.getId());
          return toRoomResponse(room, participants.stream().map(this::toParticipantInfo).collect(Collectors.toList()));
        })
        .collect(Collectors.toList());
  }

  @Transactional(readOnly = true)
  public ManittoRoomResponse getRoom(String roomCode) {
    ManittoRoom room =
        roomRepository
            .findByRoomCode(roomCode)
            .orElseThrow(() -> new NotFoundException(ErrorCode.RESOURCE_NOT_FOUND));
    List<ManittoParticipant> participants = participantRepository.findAllByRoomId(room.getId());
    return toRoomResponse(
        room, participants.stream().map(this::toParticipantInfo).collect(Collectors.toList()));
  }

  public void joinRoom(String roomCode, Long userId) {
    ManittoRoom room =
        roomRepository
            .findByRoomCode(roomCode)
            .orElseThrow(() -> new NotFoundException(ErrorCode.RESOURCE_NOT_FOUND));

    if (room.getStatus() != ManittoRoomStatus.SETUP) {
      throw new BusinessException(ErrorCode.INVALID_INPUT);
    }

    if (participantRepository.existsByRoomIdAndUserId(room.getId(), userId)) {
      throw new BusinessException(ErrorCode.INVALID_INPUT);
    }

    User user =
        userRepository
            .findById(userId)
            .orElseThrow(() -> new NotFoundException(ErrorCode.USER_NOT_FOUND));

    List<ManittoParticipant> existing = participantRepository.findAllByRoomId(room.getId());
    int colorIndex = existing.size() % AVATAR_COLORS.length;

    ManittoParticipant participant =
        ManittoParticipant.builder()
            .roomId(room.getId())
            .userId(userId)
            .userName(user.getName())
            .avatarColor(AVATAR_COLORS[colorIndex])
            .wallColor(WALL_COLORS[colorIndex])
            .isReady(true)
            .build();
    participantRepository.save(participant);

    TransactionSynchronizationManager.registerSynchronization(
        new TransactionSynchronization() {
          @Override
          public void afterCommit() {
            sseService.notifyRoomChanged(roomCode);
          }
        });
  }

  public void startMatching(String roomCode, Long userId) {
    ManittoRoom room =
        roomRepository
            .findByRoomCode(roomCode)
            .orElseThrow(() -> new NotFoundException(ErrorCode.RESOURCE_NOT_FOUND));

    if (!room.getHostUserId().equals(userId)) {
      throw new ForbiddenException(ErrorCode.FORBIDDEN);
    }

    if (room.getStatus() != ManittoRoomStatus.SETUP) {
      throw new BusinessException(ErrorCode.INVALID_INPUT);
    }

    List<ManittoParticipant> participants = participantRepository.findAllByRoomId(room.getId());
    if (participants.size() < 2) {
      throw new BusinessException(ErrorCode.INVALID_INPUT);
    }

    List<ManittoParticipant> shuffled = new ArrayList<>(participants);
    Collections.shuffle(shuffled, new Random());

    for (int i = 0; i < shuffled.size(); i++) {
      ManittoParticipant current = shuffled.get(i);
      ManittoParticipant target = shuffled.get((i + 1) % shuffled.size());
      current.assignTarget(target.getUserId());
    }

    room.updateStatus(ManittoRoomStatus.ACTIVE);

    TransactionSynchronizationManager.registerSynchronization(
        new TransactionSynchronization() {
          @Override
          public void afterCommit() {
            sseService.notifyRoomChanged(roomCode);
          }
        });
  }

  @Transactional(readOnly = true)
  public ManittoLobbyResponse getLobby(String roomCode, Long userId) {
    ManittoRoom room =
        roomRepository
            .findByRoomCode(roomCode)
            .orElseThrow(() -> new NotFoundException(ErrorCode.RESOURCE_NOT_FOUND));

    ManittoParticipant myParticipant =
        participantRepository
            .findByRoomIdAndUserId(room.getId(), userId)
            .orElseThrow(() -> new ForbiddenException(ErrorCode.FORBIDDEN));

    List<ManittoParticipant> allParticipants = participantRepository.findAllByRoomId(room.getId());

    String myTargetName = null;
    Long myTargetUserId = myParticipant.getManittoTargetUserId();
    if (myTargetUserId != null) {
      myTargetName =
          allParticipants.stream()
              .filter(p -> p.getUserId().equals(myTargetUserId))
              .map(this::displayName)
              .findFirst()
              .orElse(null);
    }

    List<ManittoItem> myItems = itemRepository.findAllByRoomIdAndOwnerUserId(room.getId(), userId);
    List<ManittoItemResponse> myLockerItems =
        myItems.stream().map(this::toItemResponse).collect(Collectors.toList());

    List<ManittoParticipantInfo> participantInfos =
        allParticipants.stream().map(this::toParticipantInfo).collect(Collectors.toList());

    return ManittoLobbyResponse.builder()
        .roomCode(room.getRoomCode())
        .endDate(room.getEndDate().format(DateTimeFormatter.ISO_DATE_TIME))
        .myTargetName(myTargetName)
        .myTargetUserId(myTargetUserId)
        .participants(participantInfos)
        .myLockerItems(myLockerItems)
        .build();
  }

  public ManittoItemResponse dropItem(String roomCode, Long fromUserId, DropItemRequest req) {
    ManittoRoom room =
        roomRepository
            .findByRoomCode(roomCode)
            .orElseThrow(() -> new NotFoundException(ErrorCode.RESOURCE_NOT_FOUND));

    if (room.getStatus() != ManittoRoomStatus.ACTIVE) {
      throw new BusinessException(ErrorCode.INVALID_INPUT);
    }

    ManittoItemType itemType = ManittoItemType.valueOf(req.getType());

    ManittoItem item =
        ManittoItem.builder()
            .roomId(room.getId())
            .ownerUserId(req.getTargetUserId())
            .fromUserId(fromUserId)
            .itemType(itemType)
            .skin(req.getSkin())
            .content(req.getContent())
            .posX(req.getPosX())
            .posY(req.getPosY())
            .build();
    item = itemRepository.save(item);
    final ManittoItem savedItem = item;

    String notifText = switch (itemType) {
      case GIFT -> "마니또가 선물을 놓고 갔어요! 🎁";
      case MESSAGE -> "마니또가 편지를 남겨줬어요! 💌";
      case HINT -> "마니또가 힌트를 남겨줬어요! 🔑";
    };
    final String finalText = notifText;
    final Long targetUserId = req.getTargetUserId();

    final ManittoItemResponse itemResponse = toItemResponse(savedItem);

    TransactionSynchronizationManager.registerSynchronization(
        new TransactionSynchronization() {
          @Override
          public void afterCommit() {
            sseService.sendEvent(
                roomCode,
                "item-dropped",
                java.util.Map.of(
                    "text", finalText,
                    "time", "방금 전",
                    "targetUserId", targetUserId,
                    "item", itemResponse));
          }
        });

    return itemResponse;
  }

  @Transactional(readOnly = true)
  public List<ManittoItemResponse> getLocker(String roomCode, Long userId) {
    ManittoRoom room =
        roomRepository
            .findByRoomCode(roomCode)
            .orElseThrow(() -> new NotFoundException(ErrorCode.RESOURCE_NOT_FOUND));

    List<ManittoItem> items = itemRepository.findAllByRoomIdAndOwnerUserId(room.getId(), userId);
    return items.stream().map(this::toItemResponse).collect(Collectors.toList());
  }

  @Transactional(readOnly = true)
  public List<ManittoItemResponse> getUserItems(String roomCode, Long targetUserId) {
    ManittoRoom room =
        roomRepository
            .findByRoomCode(roomCode)
            .orElseThrow(() -> new NotFoundException(ErrorCode.RESOURCE_NOT_FOUND));
    return itemRepository.findAllByRoomIdAndOwnerUserId(room.getId(), targetUserId)
        .stream().map(this::toItemResponse).collect(Collectors.toList());
  }

  public void storeInLocker(String roomCode, Long userId, Long itemId) {
    ManittoItem item =
        itemRepository
            .findById(itemId)
            .orElseThrow(() -> new NotFoundException(ErrorCode.RESOURCE_NOT_FOUND));
    if (!item.getOwnerUserId().equals(userId)) {
      throw new ForbiddenException(ErrorCode.FORBIDDEN);
    }
    item.storeInLocker();
  }

  public void openItem(String roomCode, Long userId, Long itemId) {
    ManittoItem item =
        itemRepository
            .findById(itemId)
            .orElseThrow(() -> new NotFoundException(ErrorCode.RESOURCE_NOT_FOUND));

    if (!item.getOwnerUserId().equals(userId)) {
      throw new ForbiddenException(ErrorCode.FORBIDDEN);
    }

    item.open();
  }

  public void submitDeduction(String roomCode, Long userId, SubmitDeductionRequest req) {
    ManittoRoom room =
        roomRepository
            .findByRoomCode(roomCode)
            .orElseThrow(() -> new NotFoundException(ErrorCode.RESOURCE_NOT_FOUND));

    Optional<ManittoDeduction> existing =
        deductionRepository.findByRoomIdAndGuesserUserId(room.getId(), userId);
    if (existing.isPresent()) {
      throw new BusinessException(ErrorCode.INVALID_INPUT);
    }

    ManittoDeduction deduction =
        ManittoDeduction.builder()
            .roomId(room.getId())
            .guesserUserId(userId)
            .guessedTargetUserId(req.getGuessedUserId())
            .reason(req.getReason())
            .build();
    deductionRepository.save(deduction);
  }

  @Transactional(readOnly = true)
  public ManittoResultResponse getResult(String roomCode, Long userId) {
    ManittoRoom room =
        roomRepository
            .findByRoomCode(roomCode)
            .orElseThrow(() -> new NotFoundException(ErrorCode.RESOURCE_NOT_FOUND));

    List<ManittoParticipant> allParticipants = participantRepository.findAllByRoomId(room.getId());

    ManittoParticipant myParticipant =
        allParticipants.stream()
            .filter(p -> p.getUserId().equals(userId))
            .findFirst()
            .orElseThrow(() -> new ForbiddenException(ErrorCode.FORBIDDEN));

    // The real manitto is the participant whose target is me
    ManittoParticipant realManitto =
        allParticipants.stream()
            .filter(
                p ->
                    p.getManittoTargetUserId() != null && p.getManittoTargetUserId().equals(userId))
            .findFirst()
            .orElse(null);

    String realManittoName = realManitto != null ? displayName(realManitto) : null;
    String realManittoAvatarColor = realManitto != null ? realManitto.getAvatarColor() : null;

    // My deduction
    Optional<ManittoDeduction> myDeduction =
        deductionRepository.findByRoomIdAndGuesserUserId(room.getId(), userId);

    Long guessedUserId = null;
    String guessedUserName = null;
    boolean isCorrect = false;
    String myGuessReason = null;

    if (myDeduction.isPresent()) {
      ManittoDeduction deduction = myDeduction.get();
      final Long resolvedGuessedUserId = deduction.getGuessedTargetUserId();
      guessedUserId = resolvedGuessedUserId;
      myGuessReason = deduction.getReason();

      guessedUserName =
          allParticipants.stream()
              .filter(p -> p.getUserId().equals(resolvedGuessedUserId))
              .map(this::displayName)
              .findFirst()
              .orElse(null);

      isCorrect = realManitto != null && realManitto.getUserId().equals(resolvedGuessedUserId);
    }

    // Others who guessed me
    List<ManittoDeduction> othersDeductions =
        deductionRepository.findAllByRoomIdAndGuessedTargetUserId(room.getId(), userId);

    List<ManittoGuessInfo> othersGuesses =
        othersDeductions.stream()
            .map(
                d -> {
                  String guesserName =
                      allParticipants.stream()
                          .filter(p -> p.getUserId().equals(d.getGuesserUserId()))
                          .map(this::displayName)
                          .findFirst()
                          .orElse("알 수 없음");
                  return ManittoGuessInfo.builder()
                      .guesserName(guesserName)
                      .reason(d.getReason())
                      .build();
                })
            .collect(Collectors.toList());

    // Build allPairs: for each manitti find their manitto and count items + visits
    List<ManittoPairResult> allPairs = new ArrayList<>();
    for (ManittoParticipant manitti : allParticipants) {
      Long manittiUserId = manitti.getUserId();
      ManittoParticipant manitto =
          allParticipants.stream()
              .filter(p -> p.getManittoTargetUserId() != null
                  && p.getManittoTargetUserId().equals(manittiUserId))
              .findFirst()
              .orElse(null);
      if (manitto == null) continue;

      int itemCount = itemRepository.countByRoomIdAndOwnerUserIdAndFromUserId(
          room.getId(), manittiUserId, manitto.getUserId());
      int visitCount = visitRepository.countByRoomIdAndVisitorUserIdAndTargetUserId(
          room.getId(), manitto.getUserId(), manittiUserId);

      allPairs.add(ManittoPairResult.builder()
          .manittoName(displayName(manitto))
          .manittiName(displayName(manitti))
          .manittoAvatarColor(manitto.getAvatarColor())
          .manittiAvatarColor(manitti.getAvatarColor())
          .itemCount(itemCount)
          .visitCount(visitCount)
          .build());
    }

    return ManittoResultResponse.builder()
        .realManittoName(realManittoName)
        .realManittoAvatarColor(realManittoAvatarColor)
        .guessedUserId(guessedUserId)
        .guessedUserName(guessedUserName)
        .isCorrect(isCorrect)
        .myGuessReason(myGuessReason)
        .othersGuesses(othersGuesses)
        .allPairs(allPairs)
        .build();
  }

  public void leaveRoom(String roomCode, Long userId) {
    ManittoRoom room =
        roomRepository
            .findByRoomCode(roomCode)
            .orElseThrow(() -> new NotFoundException(ErrorCode.RESOURCE_NOT_FOUND));

    if (!participantRepository.existsByRoomIdAndUserId(room.getId(), userId)) {
      throw new ForbiddenException(ErrorCode.FORBIDDEN);
    }

    if (room.getHostUserId().equals(userId)) {
      deductionRepository.deleteAllByRoomId(room.getId());
      itemRepository.deleteAllByRoomId(room.getId());
      visitRepository.deleteAllByRoomId(room.getId());
      participantRepository.deleteAllByRoomId(room.getId());
      roomRepository.delete(room);
    } else {
      participantRepository.deleteByRoomIdAndUserId(room.getId(), userId);
    }
  }

  public void setNickname(String roomCode, Long userId, String nickname) {
    ManittoRoom room =
        roomRepository
            .findByRoomCode(roomCode)
            .orElseThrow(() -> new NotFoundException(ErrorCode.RESOURCE_NOT_FOUND));
    ManittoParticipant participant =
        participantRepository
            .findByRoomIdAndUserId(room.getId(), userId)
            .orElseThrow(() -> new ForbiddenException(ErrorCode.FORBIDDEN));
    participant.updateNickname(nickname);

    TransactionSynchronizationManager.registerSynchronization(
        new TransactionSynchronization() {
          @Override
          public void afterCommit() {
            sseService.notifyRoomChanged(roomCode);
          }
        });
  }

  private String displayName(ManittoParticipant p) {
    return (p.getNickname() != null && !p.getNickname().isBlank()) ? p.getNickname() : p.getUserName();
  }

  private ManittoParticipantInfo toParticipantInfo(ManittoParticipant participant) {
    return ManittoParticipantInfo.builder()
        .userId(participant.getUserId())
        .name(participant.getUserName())
        .nickname(participant.getNickname())
        .avatarColor(participant.getAvatarColor())
        .wallColor(participant.getWallColor())
        .isReady(participant.isReady())
        .build();
  }

  private ManittoItemResponse toItemResponse(ManittoItem item) {
    return ManittoItemResponse.builder()
        .id(item.getId())
        .type(item.getItemType().name())
        .skin(item.getSkin())
        .content(item.getContent())
        .posX(item.getPosX())
        .posY(item.getPosY())
        .isOpened(item.isOpened())
        .inLocker(item.isInLocker())
        .fromName("익명의 마니또")
        .build();
  }

  public void recordVisit(String roomCode, Long visitorUserId, RecordVisitRequest req) {
    ManittoRoom room =
        roomRepository
            .findByRoomCode(roomCode)
            .orElseThrow(() -> new NotFoundException(ErrorCode.RESOURCE_NOT_FOUND));

    // 자기 방 방문은 기록하지 않음
    if (visitorUserId.equals(req.getTargetUserId())) return;

    ManittoVisit visit =
        ManittoVisit.builder()
            .roomId(room.getId())
            .visitorUserId(visitorUserId)
            .targetUserId(req.getTargetUserId())
            .posX(req.getPosX())
            .posY(req.getPosY())
            .build();
    visitRepository.save(visit);

    // 방 주인에게 SSE 알림
    sseService.sendEvent(
        roomCode,
        "visitor-arrived",
        java.util.Map.of("text", "누군가 내 방에 왔다갔어요! 👀", "time", "방금 전"));
  }

  @Transactional(readOnly = true)
  public List<ManittoVisitResponse> getVisits(String roomCode, Long targetUserId) {
    ManittoRoom room =
        roomRepository
            .findByRoomCode(roomCode)
            .orElseThrow(() -> new NotFoundException(ErrorCode.RESOURCE_NOT_FOUND));

    LocalDateTime since = LocalDateTime.now().minusHours(24);
    return visitRepository
        .findAllByRoomIdAndTargetUserIdAndCreatedAtAfter(room.getId(), targetUserId, since)
        .stream()
        .map(ManittoVisitResponse::new)
        .collect(Collectors.toList());
  }

  @Transactional(readOnly = true)
  public List<ManittoNotificationResponse> getNotifications(String roomCode, Long userId) {
    ManittoRoom room =
        roomRepository
            .findByRoomCode(roomCode)
            .orElseThrow(() -> new NotFoundException(ErrorCode.RESOURCE_NOT_FOUND));

    record Entry(LocalDateTime time, ManittoNotificationResponse notif) {}
    List<Entry> entries = new ArrayList<>();

    visitRepository
        .findAllByRoomIdAndTargetUserIdOrderByCreatedAtDesc(room.getId(), userId)
        .forEach(v -> entries.add(new Entry(
            v.getCreatedAt(),
            new ManittoNotificationResponse(v.getId(), "누군가 내 방에 왔다갔어요! 👀", formatTimeAgo(v.getCreatedAt())))));

    itemRepository
        .findAllByRoomIdAndOwnerUserIdOrderByCreatedAtDesc(room.getId(), userId)
        .forEach(item -> {
          String text = switch (item.getItemType()) {
            case GIFT -> "마니또가 선물을 놓고 갔어요! 🎁";
            case MESSAGE -> "마니또가 편지를 남겨줬어요! 💌";
            case HINT -> "마니또가 힌트를 남겨줬어요! 🔑";
          };
          entries.add(new Entry(
              item.getCreatedAt(),
              new ManittoNotificationResponse(item.getId() + 100_000L, text, formatTimeAgo(item.getCreatedAt()))));
        });

    entries.sort((a, b) -> b.time().compareTo(a.time()));
    return entries.stream().map(Entry::notif).collect(Collectors.toList());
  }

  public void moveCharacter(String roomCode, Long userId, int x, int y) {
    ManittoRoom room = roomRepository
        .findByRoomCode(roomCode)
        .orElseThrow(() -> new NotFoundException(ErrorCode.RESOURCE_NOT_FOUND));
    if (!participantRepository.existsByRoomIdAndUserId(room.getId(), userId)) {
      throw new ForbiddenException(ErrorCode.FORBIDDEN);
    }
    sseService.sendEvent(roomCode, "character-moved",
        java.util.Map.of("userId", userId, "x", x, "y", y));
  }

  private String formatTimeAgo(LocalDateTime time) {
    long minutes = Duration.between(time, LocalDateTime.now()).toMinutes();
    if (minutes < 1) return "방금 전";
    if (minutes < 60) return minutes + "분 전";
    long hours = minutes / 60;
    if (hours < 24) return hours + "시간 전";
    return (hours / 24) + "일 전";
  }

  private ManittoRoomResponse toRoomResponse(
      ManittoRoom room, List<ManittoParticipantInfo> participants) {
    return ManittoRoomResponse.builder()
        .roomCode(room.getRoomCode())
        .roomName(room.getRoomName())
        .hostUserId(room.getHostUserId())
        .status(room.getStatus().name())
        .endDate(room.getEndDate().format(DateTimeFormatter.ISO_DATE_TIME))
        .participants(participants)
        .build();
  }
}
