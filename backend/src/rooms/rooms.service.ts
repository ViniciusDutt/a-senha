import { randomInt, randomUUID } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { WsException } from "@nestjs/websockets";

import { RoomStatus } from "./enums/room-status.enum";
import { Team } from "./enums/team.enum";
import type { Player } from "./types/player.type";
import type { Room } from "./types/room.type";

const ROOM_ID_LENGTH = 4;

const ROOM_ID_CHARACTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const ROOM_MAX_PLAYERS = 4;
const TEAM_MAX_PLAYERS = 2;

type CreateRoomParams = {
  name: string;
  socketId: string;
};

type CreateRoomResult = {
  playerId: string;
  room: Room;
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

type SelectTeamParams = {
  roomId: string;
  socketId: string;
  team: Team;
};

type RoomOwnerActionParams = {
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

  findRoomById(roomId: string): Room | undefined {
    return this.rooms.get(this.normalizeRoomId(roomId));
  }

  joinRoom({ roomId, name, socketId }: JoinRoomParams): JoinRoomResult {
    const room = this.getRoomOrThrow(roomId);
    const normalizedName = name.trim();

    this.assertRoomIsLobby(room, "A partida já foi iniciada.");

    if (room.players.length >= ROOM_MAX_PLAYERS) {
      throw new WsException("A sala está cheia.");
    }

    const socketAlreadyJoined = room.players.some(player => player.socketId === socketId);

    if (socketAlreadyJoined) {
      throw new WsException("Você já entrou nesta sala.");
    }

    const nameAlreadyExists = room.players.some(
      player =>
        player.name.toLocaleLowerCase("pt-BR") === normalizedName.toLocaleLowerCase("pt-BR"),
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

  reconnectRoom({ roomId, playerId, socketId }: ReconnectRoomParams): ReconnectRoomResult {
    const room = this.getRoomOrThrow(roomId);

    const player = this.getPlayerByIdOrThrow(room, playerId);

    player.socketId = socketId;
    player.isConnected = true;

    return {
      playerId: player.id,
      room,
    };
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

  removePlayerById(roomId: string, playerId: string): Room | null {
    const normalizedRoomId = this.normalizeRoomId(roomId);

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
      this.transferOwnership(room);
    }

    return room;
  }

  selectTeam({ roomId, socketId, team }: SelectTeamParams): Room {
    const room = this.getRoomOrThrow(roomId);

    this.assertRoomIsLobby(room, "A partida já foi iniciada.");

    const player = this.getPlayerBySocketOrThrow(room, socketId);

    if (player.team === team) {
      return room;
    }

    const playersInTeam = this.getPlayersByTeam(room, team);

    if (playersInTeam.length >= TEAM_MAX_PLAYERS) {
      throw new WsException("Este time já está completo.");
    }

    player.team = team;

    return room;
  }

  resetTeams({ roomId, socketId }: RoomOwnerActionParams): Room {
    const room = this.validateLobbyOwner({
      roomId,
      socketId,
    });

    for (const player of room.players) {
      player.team = null;
    }

    return room;
  }

  randomizeTeams({ roomId, socketId }: RoomOwnerActionParams): Room {
    const room = this.validateLobbyOwner({
      roomId,
      socketId,
    });

    if (room.players.length !== ROOM_MAX_PLAYERS) {
      throw new WsException("São necessários quatro jogadores para sortear os times.");
    }

    const shuffledPlayers = this.shufflePlayers(room.players);

    shuffledPlayers.forEach((player, index) => {
      player.team = index < TEAM_MAX_PLAYERS ? Team.TEAM_1 : Team.TEAM_2;
    });

    return room;
  }

  updateSettings({ roomId, socketId, chatEnabled }: UpdateRoomSettingsParams): Room {
    const room = this.getRoomOrThrow(roomId);

    this.assertRoomIsLobby(room, "As configurações não podem ser alteradas após o início.");

    const player = this.getPlayerBySocketOrThrow(room, socketId);

    this.assertPlayerIsOwner(player, "Apenas o dono pode alterar as configurações.");

    room.settings.chatEnabled = chatEnabled;

    return room;
  }

  validateStartRoom({ roomId, socketId }: RoomOwnerActionParams): Room {
    const room = this.getRoomOrThrow(roomId);

    this.assertRoomIsLobby(room, "A partida já foi iniciada.");

    const owner = this.getPlayerBySocketOrThrow(room, socketId);

    this.assertPlayerIsOwner(owner, "Apenas o dono pode iniciar a partida.");

    const team1Players = this.getPlayersByTeam(room, Team.TEAM_1);

    const team2Players = this.getPlayersByTeam(room, Team.TEAM_2);

    if (team1Players.length !== TEAM_MAX_PLAYERS || team2Players.length !== TEAM_MAX_PLAYERS) {
      throw new WsException("Os dois times precisam ter exatamente dois jogadores.");
    }

    const hasDisconnectedPlayer = room.players.some(player => !player.isConnected);

    if (hasDisconnectedPlayer) {
      throw new WsException("Todos os jogadores precisam estar conectados.");
    }

    return room;
  }

  startRoom(params: RoomOwnerActionParams): Room {
    const room = this.validateStartRoom(params);

    room.status = RoomStatus.PLAYING;

    return room;
  }

  finishRoom(roomId: string): Room {
    const room = this.getRoomOrThrow(roomId);

    room.status = RoomStatus.FINISHED;

    return room;
  }

  returnToLobby({ roomId, socketId }: RoomOwnerActionParams): Room {
    const room = this.getRoomOrThrow(roomId);

    const player = this.getPlayerBySocketOrThrow(room, socketId);

    this.assertPlayerIsOwner(player, "Apenas o dono pode iniciar uma nova partida.");

    if (room.status !== RoomStatus.FINISHED) {
      throw new WsException("A partida ainda não foi encerrada.");
    }

    room.status = RoomStatus.LOBBY;

    return room;
  }

  private getRoomOrThrow(roomId: string): Room {
    const room = this.rooms.get(this.normalizeRoomId(roomId));

    if (!room) {
      throw new WsException("Sala não encontrada.");
    }

    return room;
  }

  private getPlayerBySocketOrThrow(room: Room, socketId: string): Player {
    const player = room.players.find(currentPlayer => currentPlayer.socketId === socketId);

    if (!player) {
      throw new WsException("Jogador não encontrado na sala.");
    }

    return player;
  }

  private getPlayerByIdOrThrow(room: Room, playerId: string): Player {
    const player = room.players.find(currentPlayer => currentPlayer.id === playerId);

    if (!player) {
      throw new WsException("Jogador não encontrado na sala.");
    }

    return player;
  }

  private getPlayersByTeam(room: Room, team: Team): Player[] {
    return room.players.filter(player => player.team === team);
  }

  private assertRoomIsLobby(room: Room, message: string): void {
    if (room.status !== RoomStatus.LOBBY) {
      throw new WsException(message);
    }
  }

  private assertPlayerIsOwner(player: Player, message: string): void {
    if (!player.isOwner) {
      throw new WsException(message);
    }
  }

  private validateLobbyOwner({ roomId, socketId }: RoomOwnerActionParams): Room {
    const room = this.getRoomOrThrow(roomId);

    this.assertRoomIsLobby(room, "Esta ação só pode ser realizada no lobby.");

    const player = this.getPlayerBySocketOrThrow(room, socketId);

    this.assertPlayerIsOwner(player, "Apenas o dono pode organizar os times.");

    return room;
  }

  private transferOwnership(room: Room): void {
    const newOwner = room.players.find(player => player.isConnected) ?? room.players[0];

    if (!newOwner) {
      return;
    }

    room.ownerId = newOwner.id;

    for (const player of room.players) {
      player.isOwner = player.id === newOwner.id;
    }
  }

  private shufflePlayers(players: Player[]): Player[] {
    const shuffledPlayers = [...players];

    for (let index = shuffledPlayers.length - 1; index > 0; index--) {
      const randomIndex = randomInt(index + 1);

      const currentPlayer = shuffledPlayers[index];

      const randomPlayer = shuffledPlayers[randomIndex];

      if (!currentPlayer || !randomPlayer) {
        continue;
      }

      shuffledPlayers[index] = randomPlayer;
      shuffledPlayers[randomIndex] = currentPlayer;
    }

    return shuffledPlayers;
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
      const randomIndex = randomInt(ROOM_ID_CHARACTERS.length);

      roomId += ROOM_ID_CHARACTERS[randomIndex];
    }

    return roomId;
  }

  private normalizeRoomId(roomId: string): string {
    return roomId.toUpperCase();
  }
}
