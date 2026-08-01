import {
  Injectable,
  Logger,
  type OnModuleDestroy,
} from "@nestjs/common";

import { PLAYER_RECONNECT_GRACE_PERIOD_MS } from "../game/constants/game-timing.constants";
import type { Room } from "./types/room.type";
import { RoomsService } from "./rooms.service";

type ReconnectPlayerParams = {
  roomId: string;
  playerId: string;
  socketId: string;
};

type ReconnectPlayerResult = {
  playerId: string;
  room: Room;
};

type RoomUpdatedCallback = (room: Room) => void;

@Injectable()
export class RoomConnectionService
  implements OnModuleDestroy {
  private readonly logger = new Logger(
    RoomConnectionService.name,
  );

  private readonly disconnectTimers = new Map<
    string,
    ReturnType<typeof setTimeout>
  >();

  constructor(
    private readonly roomsService: RoomsService,
  ) { }

  handleDisconnect(
    socketId: string,
    onRoomUpdated: RoomUpdatedCallback,
  ): void {
    const result =
      this.roomsService.markPlayerAsDisconnected(
        socketId,
      );

    if (!result) {
      return;
    }

    const { playerId, room } = result;

    onRoomUpdated(room);

    this.cancelPendingRemoval(playerId);

    const timer = setTimeout(() => {
      this.disconnectTimers.delete(playerId);

      const updatedRoom =
        this.roomsService.removePlayerById(
          room.id,
          playerId,
        );

      if (!updatedRoom) {
        return;
      }

      onRoomUpdated(updatedRoom);
    }, PLAYER_RECONNECT_GRACE_PERIOD_MS);

    this.disconnectTimers.set(playerId, timer);
  }

  reconnectPlayer({
    roomId,
    playerId,
    socketId,
  }: ReconnectPlayerParams): ReconnectPlayerResult {
    const result = this.roomsService.reconnectRoom({
      roomId,
      playerId,
      socketId,
    });

    this.cancelPendingRemoval(result.playerId);

    return result;
  }

  cancelPendingRemoval(playerId: string): void {
    const timer =
      this.disconnectTimers.get(playerId);

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

    this.logger.log(
      "Timers de desconexão foram encerrados.",
    );
  }
}