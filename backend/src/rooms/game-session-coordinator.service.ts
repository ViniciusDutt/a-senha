import { Injectable, Logger, type OnModuleDestroy } from "@nestjs/common";
import { WsException } from "@nestjs/websockets";

import {
  GAME_COUNTDOWN_DURATION_MS,
  NEXT_ROUND_TRANSITION_DELAY_MS,
  NEXT_TURN_TRANSITION_DELAY_MS,
  TURN_DURATION_MS,
} from "../game/constants/game-timing.constants";
import { GameService } from "../game/game.service";
import type { Game } from "../game/types/game.type";
import type { PublicGame } from "../game/types/public-game.type";
import { Team } from "./enums/team.enum";
import { RoomsService } from "./rooms.service";
import type { Player } from "./types/player.type";
import type { Room } from "./types/room.type";

type GameTransition = "next_turn" | "round_finished" | "game_finished";

type StartRoomParams = {
  roomId: string;
  socketId: string;
  onCountdown: (roomId: string) => void;
};

type StartRoomResult = {
  room: Room;
  game: PublicGame;
};

type StartTurnParams = {
  roomId: string;
  player: Player;
  events: GameSessionEvents;
};

type StartTurnResult = {
  game: Game;
  publicGame: PublicGame;
  word: string;
};

type DeliverWordParams = {
  roomId: string;
  activeTeam: Team;
  clueGiverId: string;
  word: string;
  onDeliver: (socketId: string, payload: { word: string }) => void;
};

export type GameSessionEvents = {
  onGameUpdated: (roomId: string, game: PublicGame) => void;

  onTurnFinished: (roomId: string, game: PublicGame) => void;

  onRoomUpdated: (room: Room) => void;
};

@Injectable()
export class GameSessionCoordinatorService implements OnModuleDestroy {
  private readonly logger = new Logger(GameSessionCoordinatorService.name);

  private readonly startingRooms = new Set<string>();

  private readonly turnTimers = new Map<string, ReturnType<typeof setTimeout>>();

  private readonly transitionTimers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(
    private readonly roomsService: RoomsService,
    private readonly gameService: GameService,
  ) {}

  async startRoom({ roomId, socketId, onCountdown }: StartRoomParams): Promise<StartRoomResult> {
    const normalizedRoomId = roomId.toUpperCase();

    if (this.startingRooms.has(normalizedRoomId)) {
      throw new WsException("A partida já está sendo iniciada.");
    }

    const room = this.roomsService.validateStartRoom({
      roomId: normalizedRoomId,
      socketId,
    });

    this.startingRooms.add(room.id);

    try {
      onCountdown(room.id);

      await this.wait(GAME_COUNTDOWN_DURATION_MS);

      const startedRoom = this.roomsService.startRoom({
        roomId: room.id,
        socketId,
      });

      const game = this.gameService.createGame(startedRoom);

      return {
        room: startedRoom,
        game: this.gameService.toPublicGame(game),
      };
    } finally {
      this.startingRooms.delete(room.id);
    }
  }

  startTurn({ roomId, player, events }: StartTurnParams): StartTurnResult {
    const result = this.gameService.startTurn({
      roomId,
      player,
    });

    this.scheduleTurnEnd(result.game.roomId, events);

    return result;
  }

  pauseTurnTimer(roomId: string): void {
    this.clearTurnTimer(roomId.toUpperCase());
  }

  resumeTurnTimer(roomId: string, remainingTurnMs: number, events: GameSessionEvents): void {
    if (remainingTurnMs <= 0) {
      return;
    }

    this.scheduleTurnEnd(roomId, events, remainingTurnMs);
  }

  deliverWordToAllowedPlayers({
    roomId,
    activeTeam,
    clueGiverId,
    word,
    onDeliver,
  }: DeliverWordParams): void {
    const room = this.roomsService.findRoomById(roomId);

    if (!room) {
      return;
    }

    const allowedPlayers = room.players.filter(player => {
      const isClueGiver = player.id === clueGiverId;

      const isOpponent = player.team !== activeTeam;

      return isClueGiver || isOpponent;
    });

    for (const player of allowedPlayers) {
      onDeliver(player.socketId, {
        word,
      });
    }
  }

  clearRoomTimers(roomId: string): void {
    const normalizedRoomId = roomId.toUpperCase();

    this.clearTurnTimer(normalizedRoomId);
    this.clearTransitionTimer(normalizedRoomId);

    this.startingRooms.delete(normalizedRoomId);
  }

  isRoomStarting(roomId: string): boolean {
    return this.startingRooms.has(roomId.toUpperCase());
  }

  onModuleDestroy(): void {
    for (const timer of this.turnTimers.values()) {
      clearTimeout(timer);
    }

    for (const timer of this.transitionTimers.values()) {
      clearTimeout(timer);
    }

    this.turnTimers.clear();
    this.transitionTimers.clear();
    this.startingRooms.clear();

    this.logger.log("Timers das partidas foram encerrados.");
  }

  private scheduleTurnEnd(
    roomId: string,
    events: GameSessionEvents,
    durationMs: number = TURN_DURATION_MS,
  ): void {
    const normalizedRoomId = roomId.toUpperCase();

    this.clearTurnTimer(normalizedRoomId);

    const timer = setTimeout(() => {
      this.turnTimers.delete(normalizedRoomId);

      try {
        const result = this.gameService.finishTurn(normalizedRoomId);

        events.onTurnFinished(normalizedRoomId, result.publicGame);

        if (result.transition === "game_finished") {
          const finishedRoom = this.roomsService.finishRoom(normalizedRoomId);

          events.onRoomUpdated(finishedRoom);
        }

        this.scheduleGameTransition(normalizedRoomId, result.transition, events);
      } catch (error) {
        this.logger.error(`Erro ao finalizar o turno da sala ${normalizedRoomId}`, error);
      }
    }, durationMs);

    this.turnTimers.set(normalizedRoomId, timer);
  }

  private scheduleGameTransition(
    roomId: string,
    transition: GameTransition,
    events: GameSessionEvents,
  ): void {
    this.clearTransitionTimer(roomId);

    if (transition === "game_finished") {
      return;
    }

    const delay =
      transition === "next_turn" ? NEXT_TURN_TRANSITION_DELAY_MS : NEXT_ROUND_TRANSITION_DELAY_MS;

    const timer = setTimeout(() => {
      this.transitionTimers.delete(roomId);

      try {
        const publicGame =
          transition === "next_turn"
            ? this.gameService.prepareNextTurn(roomId)
            : this.gameService.advanceRound(roomId);

        events.onGameUpdated(roomId, publicGame);
      } catch (error) {
        this.logger.error(`Erro ao avançar a partida da sala ${roomId}`, error);
      }
    }, delay);

    this.transitionTimers.set(roomId, timer);
  }

  private clearTurnTimer(roomId: string): void {
    const timer = this.turnTimers.get(roomId);

    if (!timer) {
      return;
    }

    clearTimeout(timer);
    this.turnTimers.delete(roomId);
  }

  private clearTransitionTimer(roomId: string): void {
    const timer = this.transitionTimers.get(roomId);

    if (!timer) {
      return;
    }

    clearTimeout(timer);
    this.transitionTimers.delete(roomId);
  }

  private wait(duration: number): Promise<void> {
    return new Promise(resolve => {
      setTimeout(resolve, duration);
    });
  }
}
