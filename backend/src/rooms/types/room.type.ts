import type { RoomStatus } from "../enums/room-status.enum";
import type { Player } from "./player.type";

export type Room = {
  id: string;
  ownerId: string;
  status: RoomStatus;
  players: Player[];
  createdAt: Date;
};
