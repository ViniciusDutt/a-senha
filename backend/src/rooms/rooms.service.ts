import { randomInt, randomUUID } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { WsException } from "@nestjs/websockets";
import { RoomStatus } from "./enums/room-status.enum";
import { Team } from "./enums/team.enum";
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

type SelectTeamParams = {
  roomId: string;
  socketId: string;
  team: Team;
};

type JoinRoomParams = {
  roomId: string;
  name: string;
  socketId: string;
};

type JoinRoomResult = {
  playerId: string;
  room: Room;
};

type ReconnectRoomParams = {
  roomId: string;
  playerId: string;
  socketId: string;
};

type ReconnectRoomResult = {
  playerId: string;
  room: Room;
};

type DisconnectedPlayerResult = {
  playerId: string;
  room: Room;
};

type StartRoomParams = {
  roomId: string;
  socketId: string;
};

type UpdateRoomSettingsParams = {
  roomId: string;
  socketId: string;
  chatEnabled: boolean;
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
      isConnected: true,
    };

    const room: Room = {
      id: roomId,
      ownerId: playerId,
      status: RoomStatus.LOBBY,
      players: [owner],
      settings: {
        chatEnabled: false,
      },
      createdAt: new Date(),
    };

    this.rooms.set(roomId, room);

    return {
      playerId,
      room,
    };
  }

  selectTeam({ roomId, socketId, team }: SelectTeamParams): Room {
    const room = this.rooms.get(roomId.toUpperCase());

    if (!room) {
      throw new WsException("Sala não encontrada.");
    }

    if (room.status !== RoomStatus.LOBBY) {
      throw new WsException("A partida já foi iniciada.");
    }

    const player = room.players.find(currentPlayer => currentPlayer.socketId === socketId);

    if (!player) {
      throw new WsException("Jogador não encontrado na sala.");
    }

    if (player.team === team) {
      return room;
    }

    const playersInTeam = room.players.filter(currentPlayer => currentPlayer.team === team);

    if (playersInTeam.length >= 2) {
      throw new WsException("Este time já está completo.");
    }

    player.team = team;

    return room;
  }

  joinRoom({ roomId, name, socketId }: JoinRoomParams): JoinRoomResult {
    const normalizedRoomId = roomId.toUpperCase();
    const normalizedName = name.trim();

    const room = this.rooms.get(normalizedRoomId);

    if (!room) {
      throw new WsException("Sala não encontrada.");
    }

    if (room.status !== RoomStatus.LOBBY) {
      throw new WsException("A partida já foi iniciada.");
    }

    if (room.players.length >= 4) {
      throw new WsException("A sala está cheia.");
    }

    const socketAlreadyJoined = room.players.some(player => player.socketId === socketId);

    if (socketAlreadyJoined) {
      throw new WsException("Você já entrou nesta sala.");
    }

    const nameAlreadyExists = room.players.some(
      player => player.name.toLowerCase() === normalizedName.toLowerCase(),
    );

    if (nameAlreadyExists) {
      throw new WsException("Esse nome já está sendo usado na sala.");
    }

    const playerId = randomUUID();

    const player: Player = {
      id: playerId,
      socketId,
      name: normalizedName,
      team: null,
      isOwner: false,
      isConnected: true,
    };

    room.players.push(player);

    return {
      playerId,
      room,
    };
  }

  updateSettings({ roomId, socketId, chatEnabled }: UpdateRoomSettingsParams): Room {
    const room = this.rooms.get(roomId.toUpperCase());

    if (!room) {
      throw new WsException("Sala não encontrada.");
    }

    if (room.status !== RoomStatus.LOBBY) {
      throw new WsException("As configurações não podem ser alteradas após o início.");
    }

    const player = room.players.find(currentPlayer => currentPlayer.socketId === socketId);

    if (!player) {
      throw new WsException("Jogador não encontrado na sala.");
    }

    if (!player.isOwner) {
      throw new WsException("Apenas o dono pode alterar as configurações.");
    }

    room.settings.chatEnabled = chatEnabled;

    return room;
  }

  startRoom({ roomId, socketId }: StartRoomParams): Room {
    const room = this.rooms.get(roomId.toUpperCase());

    if (!room) {
      throw new WsException("Sala não encontrada.");
    }

    if (room.status !== RoomStatus.LOBBY) {
      throw new WsException("A partida já foi iniciada.");
    }

    const owner = room.players.find(player => player.socketId === socketId);

    if (!owner) {
      throw new WsException("Jogador não encontrado na sala.");
    }

    if (!owner.isOwner) {
      throw new WsException("Apenas o dono pode iniciar a partida.");
    }

    const team1Players = room.players.filter(player => player.team === Team.TEAM_1);

    const team2Players = room.players.filter(player => player.team === Team.TEAM_2);

    if (team1Players.length !== 2 || team2Players.length !== 2) {
      throw new WsException("Os dois times precisam ter exatamente dois jogadores.");
    }

    const hasDisconnectedPlayer = room.players.some(player => !player.isConnected);

    if (hasDisconnectedPlayer) {
      throw new WsException("Todos os jogadores precisam estar conectados.");
    }

    room.status = RoomStatus.PLAYING;

    return room;
  }

  removePlayerById(roomId: string, playerId: string): Room | null {
    const normalizedRoomId = roomId.toUpperCase();
    const room = this.rooms.get(normalizedRoomId);

    if (!room) {
      return null;
    }

    const playerIndex = room.players.findIndex(player => player.id === playerId);

    if (playerIndex === -1) {
      return room;
    }

    const player = room.players[playerIndex];

    if (!player || player.isConnected) {
      return room;
    }

    const [removedPlayer] = room.players.splice(playerIndex, 1);

    if (!removedPlayer) {
      return room;
    }

    if (room.players.length === 0) {
      this.rooms.delete(normalizedRoomId);
      return null;
    }

    if (removedPlayer.isOwner) {
      const newOwner =
        room.players.find(currentPlayer => currentPlayer.isConnected) ?? room.players[0];

      if (newOwner) {
        room.ownerId = newOwner.id;

        for (const currentPlayer of room.players) {
          currentPlayer.isOwner = currentPlayer.id === newOwner.id;
        }
      }
    }

    return room;
  }

  findRoomById(roomId: string): Room | undefined {
    return this.rooms.get(roomId.toUpperCase());
  }

  markPlayerAsDisconnected(socketId: string): DisconnectedPlayerResult | null {
    for (const room of this.rooms.values()) {
      const player = room.players.find(currentPlayer => currentPlayer.socketId === socketId);

      if (!player) {
        continue;
      }

      player.isConnected = false;

      return {
        playerId: player.id,
        room,
      };
    }

    return null;
  }

  reconnectRoom({ roomId, playerId, socketId }: ReconnectRoomParams): ReconnectRoomResult {
    const room = this.rooms.get(roomId.toUpperCase());

    if (!room) {
      throw new WsException("Sala não encontrada.");
    }

    const player = room.players.find(currentPlayer => currentPlayer.id === playerId);

    if (!player) {
      throw new WsException("Jogador não encontrado na sala.");
    }

    player.socketId = socketId;
    player.isConnected = true;

    return {
      playerId: player.id,
      room,
    };
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
