import { Injectable, Logger, type OnModuleDestroy } from "@nestjs/common";

import { PLAYER_RECONNECT_GRACE_PERIOD_MS } from "../game/constants/game-timing.constants";
import { GameService } from "../game/game.service";
import type { PublicGame } from "../game/types/public-game.type";
import { RoomStatus } from "./enums/room-status.enum";
import {
  GameSessionCoordinatorService,
  type GameSessionEvents,
} from "./game-session-coordinator.service";
import { RoomsService } from "./rooms.service";
import type { Room } from "./types/room.type";

type ReconnectPlayerParams = {
  roomId: string;
  playerId: string;
  socketId: string;
  events: GameSessionEvents;
};

type ReconnectPlayerResult = {
  playerId: string;
  room: Room;
  resumedGame: PublicGame | null;
};

type DisconnectCallbacks = {
  onRoomUpdated: (room: Room) => void;
  onGamePaused: (roomId: string, game: PublicGame) => void;
  onGameCancelled: (room: Room) => void;
};

@Injectable()
export class RoomConnectionService implements OnModuleDestroy {
  private readonly logger = new Logger(RoomConnectionService.name);

  private readonly disconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(
    private readonly roomsService: RoomsService,
    private readonly gameService: GameService,
    private readonly gameSessionCoordinator: GameSessionCoordinatorService,
  ) {}

  handleDisconnect(socketId: string, callbacks: DisconnectCallbacks): void {
    const result = this.roomsService.markPlayerAsDisconnected(socketId);

    if (!result) {
      return;
    }

    const { playerId, room } = result;

    callbacks.onRoomUpdated(room);

    this.pauseGameIfNeeded(room, callbacks);

    this.cancelPendingRemoval(playerId);

    const timer = setTimeout(() => {
      this.disconnectTimers.delete(playerId);

      this.finalizeDisconnect(room.id, playerId, callbacks);
    }, PLAYER_RECONNECT_GRACE_PERIOD_MS);

    this.disconnectTimers.set(playerId, timer);
  }

  reconnectPlayer({
    roomId,
    playerId,
    socketId,
    events,
  }: ReconnectPlayerParams): ReconnectPlayerResult {
    const result = this.roomsService.reconnectRoom({
      roomId,
      playerId,
      socketId,
    });

    this.cancelPendingRemoval(result.playerId);

    const resumedGame = this.resumeGameIfNeeded(result.room, events);

    return {
      ...result,
      resumedGame,
    };
  }

  cancelPendingRemoval(playerId: string): void {
    const timer = this.disconnectTimers.get(playerId);

    if (!timer) {
      return;
    }

    clearTimeout(timer);
    this.disconnectTimers.delete(playerId);
  }

  hasPendingRemoval(playerId: string): boolean {
    return this.disconnectTimers.has(playerId);
  }

  onModuleDestroy(): void {
    for (const timer of this.disconnectTimers.values()) {
      clearTimeout(timer);
    }

    this.disconnectTimers.clear();

    this.logger.log("Timers de desconexão foram encerrados.");
  }

  private finalizeDisconnect(
    roomId: string,
    playerId: string,
    callbacks: DisconnectCallbacks,
  ): void {
    const updatedRoom = this.roomsService.removePlayerById(roomId, playerId);

    if (!updatedRoom) {
      return;
    }

    if (updatedRoom.status !== RoomStatus.PLAYING) {
      callbacks.onRoomUpdated(updatedRoom);
      return;
    }

    this.gameService.deleteGame(updatedRoom.id);
    this.gameSessionCoordinator.clearRoomTimers(updatedRoom.id);

    const lobbyRoom = this.roomsService.cancelToLobby(updatedRoom.id);

    if (lobbyRoom) {
      callbacks.onGameCancelled(lobbyRoom);
    }
  }

  private pauseGameIfNeeded(room: Room, callbacks: DisconnectCallbacks): void {
    if (room.status !== RoomStatus.PLAYING) {
      return;
    }

    const game = this.gameService.findGameByRoomId(room.id);

    if (!game || game.isPaused) {
      return;
    }

    const { publicGame } = this.gameService.pauseGame(room.id);

    this.gameSessionCoordinator.pauseTurnTimer(room.id);

    callbacks.onGamePaused(room.id, publicGame);
  }

  private resumeGameIfNeeded(room: Room, events: GameSessionEvents): PublicGame | null {
    if (room.status !== RoomStatus.PLAYING) {
      return null;
    }

    const game = this.gameService.findGameByRoomId(room.id);

    if (!game?.isPaused) {
      return null;
    }

    const allPlayersConnected = room.players.every(player => player.isConnected);

    if (!allPlayersConnected) {
      return null;
    }

    const { publicGame, remainingTurnMs } = this.gameService.resumeGame(room.id);

    if (remainingTurnMs !== null) {
      this.gameSessionCoordinator.resumeTurnTimer(room.id, remainingTurnMs, events);
    }

    return publicGame;
  }
}
