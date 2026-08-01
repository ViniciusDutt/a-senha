import { randomInt, randomUUID } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { RoomStatus } from "./enums/room-status.enum";
import type { Player } from "./types/player.type";
import type { Room } from "./types/room.type";

const ROOM_ID_LENGTH = 4;
const ROOM_ID_CHARACTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

type CreateRoomParams = {
  name: string;
  socketId: string;
};

type CreateRoomResult = {
  playerId: string;
  room: Room;
};

@Injectable()
export class RoomsService {
  private readonly rooms = new Map<string, Room>();

  createRoom({ name, socketId }: CreateRoomParams): CreateRoomResult {
    const roomId = this.generateUniqueRoomId();
    const playerId = randomUUID();

    const owner: Player = {
      id: playerId,
      socketId,
      name: name.trim(),
      team: null,
      isOwner: true,
    };

    const room: Room = {
      id: roomId,
      ownerId: playerId,
      status: RoomStatus.LOBBY,
      players: [owner],
      createdAt: new Date(),
    };

    this.rooms.set(roomId, room);

    return {
      playerId,
      room,
    };
  }

  findRoomById(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  private generateUniqueRoomId(): string {
    let roomId = this.generateRoomId();

    while (this.rooms.has(roomId)) {
      roomId = this.generateRoomId();
    }

    return roomId;
  }

  private generateRoomId(): string {
    let roomId = "";

    for (let index = 0; index < ROOM_ID_LENGTH; index++) {
      roomId += ROOM_ID_CHARACTERS[randomInt(ROOM_ID_CHARACTERS.length)];
    }

    return roomId;
  }
}
