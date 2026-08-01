import { Logger } from "@nestjs/common";
import {
  ConnectedSocket,
  MessageBody,
  type OnGatewayConnection,
  type OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from "@nestjs/websockets";
import type { Server, Socket } from "socket.io";
import { ReconnectGameDto } from "src/game/dto/reconnect-game.dto";
import { RematchDto } from "src/game/dto/rematch.dto";
import { CorrectWordDto } from "../game/dto/correct-word.dto";
import { SkipWordDto } from "../game/dto/skip-word.dto";
import { StartTurnDto } from "../game/dto/start-turn.dto";
import { GameService } from "../game/game.service";
import { CreateRoomDto } from "./dto/create-room.dto";
import { JoinRoomDto } from "./dto/join-room.dto";
import { RandomizeTeamsDto } from "./dto/randomize-teams.dto";
import { ReconnectRoomDto } from "./dto/reconnect-room.dto";
import { ResetTeamsDto } from "./dto/reset-teams.dto";
import { SelectTeamDto } from "./dto/select-team.dto";
import { StartRoomDto } from "./dto/start-room.dto";
import { UpdateRoomSettingsDto } from "./dto/update-room-settings.dto";
import { Team } from "./enums/team.enum";
import { RoomsService } from "./rooms.service";

@WebSocketGateway({
  cors: {
    origin: "http://localhost:3000",
  },
})
export class RoomsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private server!: Server;

  private readonly logger = new Logger(RoomsGateway.name);

  private readonly disconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();

  private readonly startingRooms = new Set<string>();

  private readonly turnTimers = new Map<string, ReturnType<typeof setTimeout>>();

  private readonly transitionTimers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(
    private readonly roomsService: RoomsService,
    private readonly gameService: GameService,
  ) {}

  private findPlayerInRoom(roomId: string, socketId: string) {
    const room = this.roomsService.findRoomById(roomId);

    if (!room) {
      throw new WsException("Sala não encontrada.");
    }

    const player = room.players.find(currentPlayer => currentPlayer.socketId === socketId);

    if (!player) {
      throw new WsException("Jogador não encontrado na sala.");
    }

    return {
      room,
      player,
    };
  }

  private scheduleGameTransition(
    roomId: string,
    transition: "next_turn" | "round_finished" | "game_finished",
  ): void {
    const existingTimer = this.transitionTimers.get(roomId);

    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    if (transition === "game_finished") {
      return;
    }

    const delay = transition === "next_turn" ? 3_000 : 4_000;

    const timer = setTimeout(() => {
      this.transitionTimers.delete(roomId);

      try {
        const publicGame =
          transition === "next_turn"
            ? this.gameService.prepareNextTurn(roomId)
            : this.gameService.advanceRound(roomId);

        this.server.to(roomId).emit("game:updated", publicGame);
      } catch (error) {
        this.logger.error(`Erro ao avançar a partida da sala ${roomId}`, error);
      }
    }, delay);

    this.transitionTimers.set(roomId, timer);
  }

  private clearRoomTimers(roomId: string): void {
    const turnTimer = this.turnTimers.get(roomId);

    if (turnTimer) {
      clearTimeout(turnTimer);
      this.turnTimers.delete(roomId);
    }

    const transitionTimer = this.transitionTimers.get(roomId);

    if (transitionTimer) {
      clearTimeout(transitionTimer);
      this.transitionTimers.delete(roomId);
    }

    this.startingRooms.delete(roomId);
  }

  private emitWordToAllowedPlayers(
    roomId: string,
    activeTeam: Team,
    clueGiverId: string,
    word: string,
  ): void {
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
      this.server.to(player.socketId).emit("game:word", {
        word,
      });
    }
  }

  handleConnection(client: Socket) {
    this.logger.log(`Socket conectado: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Socket desconectado: ${client.id}`);

    const result = this.roomsService.markPlayerAsDisconnected(client.id);

    if (!result) {
      return;
    }

    const { playerId, room } = result;

    this.server.to(room.id).emit("room:updated", room);

    const existingTimer = this.disconnectTimers.get(playerId);

    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      this.disconnectTimers.delete(playerId);

      const updatedRoom = this.roomsService.removePlayerById(room.id, playerId);

      if (!updatedRoom) {
        return;
      }

      this.server.to(updatedRoom.id).emit("room:updated", updatedRoom);
    }, 15_000);

    this.disconnectTimers.set(playerId, timer);
  }

  @SubscribeMessage("room:create")
  async handleCreateRoom(@MessageBody() data: CreateRoomDto, @ConnectedSocket() client: Socket) {
    const result = this.roomsService.createRoom({
      name: data.name,
      socketId: client.id,
    });

    await client.join(result.room.id);

    return {
      success: true,
      data: result,
    };
  }

  @SubscribeMessage("room:join")
  async handleJoinRoom(@MessageBody() data: JoinRoomDto, @ConnectedSocket() client: Socket) {
    const result = this.roomsService.joinRoom({
      roomId: data.roomId,
      name: data.name,
      socketId: client.id,
    });

    await client.join(result.room.id);

    this.server.to(result.room.id).emit("room:updated", result.room);

    return {
      success: true,
      data: result,
    };
  }

  @SubscribeMessage("game:reconnect")
  async handleReconnectGame(
    @MessageBody() data: ReconnectGameDto,
    @ConnectedSocket() client: Socket,
  ) {
    const reconnectResult = this.roomsService.reconnectRoom({
      roomId: data.roomId,
      playerId: data.playerId,
      socketId: client.id,
    });

    const disconnectTimer = this.disconnectTimers.get(reconnectResult.playerId);

    if (disconnectTimer) {
      clearTimeout(disconnectTimer);

      this.disconnectTimers.delete(reconnectResult.playerId);
    }

    await client.join(reconnectResult.room.id);

    const player = reconnectResult.room.players.find(
      currentPlayer => currentPlayer.id === reconnectResult.playerId,
    );

    if (!player) {
      throw new WsException("Jogador não encontrado na sala.");
    }

    const gameResult = this.gameService.getReconnectState({
      roomId: reconnectResult.room.id,
      player,
    });

    this.server.to(reconnectResult.room.id).emit("room:updated", reconnectResult.room);

    return {
      success: true,
      data: {
        playerId: reconnectResult.playerId,
        room: reconnectResult.room,
        game: gameResult.publicGame,
        word: gameResult.word,
      },
    };
  }

  @SubscribeMessage("room:select-team")
  handleSelectTeam(@MessageBody() data: SelectTeamDto, @ConnectedSocket() client: Socket) {
    const room = this.roomsService.selectTeam({
      roomId: data.roomId,
      socketId: client.id,
      team: data.team,
    });

    this.server.to(room.id).emit("room:updated", room);

    return {
      success: true,
      data: {
        room,
      },
    };
  }

  @SubscribeMessage("room:start")
  async handleStartRoom(@MessageBody() data: StartRoomDto, @ConnectedSocket() client: Socket) {
    const normalizedRoomId = data.roomId.toUpperCase();

    if (this.startingRooms.has(normalizedRoomId)) {
      throw new WsException("A partida já está sendo iniciada.");
    }

    const room = this.roomsService.validateStartRoom({
      roomId: normalizedRoomId,
      socketId: client.id,
    });

    this.startingRooms.add(room.id);

    try {
      this.server.to(room.id).emit("game:countdown");

      await new Promise<void>(resolve => {
        setTimeout(resolve, 4000);
      });

      const startedRoom = this.roomsService.startRoom({
        roomId: room.id,
        socketId: client.id,
      });

      const game = this.gameService.createGame(startedRoom);

      const publicGame = this.gameService.toPublicGame(game);

      this.server.to(startedRoom.id).emit("game:started", {
        room: startedRoom,
        game: publicGame,
      });

      return {
        success: true,
        data: {
          room: startedRoom,
          game: publicGame,
        },
      };
    } finally {
      this.startingRooms.delete(room.id);
    }
  }

  @SubscribeMessage("room:reconnect")
  async handleReconnectRoom(
    @MessageBody() data: ReconnectRoomDto,
    @ConnectedSocket() client: Socket,
  ) {
    const result = this.roomsService.reconnectRoom({
      roomId: data.roomId,
      playerId: data.playerId,
      socketId: client.id,
    });

    const disconnectTimer = this.disconnectTimers.get(result.playerId);

    if (disconnectTimer) {
      clearTimeout(disconnectTimer);
      this.disconnectTimers.delete(result.playerId);
    }

    await client.join(result.room.id);

    this.server.to(result.room.id).emit("room:updated", result.room);

    return {
      success: true,
      data: result,
    };
  }

  @SubscribeMessage("room:update-settings")
  handleUpdateSettings(
    @MessageBody() data: UpdateRoomSettingsDto,
    @ConnectedSocket() client: Socket,
  ) {
    const room = this.roomsService.updateSettings({
      roomId: data.roomId,
      socketId: client.id,
      chatEnabled: data.chatEnabled,
    });

    this.server.to(room.id).emit("room:updated", room);

    return {
      success: true,
      data: {
        room,
      },
    };
  }

  @SubscribeMessage("game:start-turn")
  handleStartTurn(@MessageBody() data: StartTurnDto, @ConnectedSocket() client: Socket) {
    const { room, player } = this.findPlayerInRoom(data.roomId, client.id);

    const result = this.gameService.startTurn({
      roomId: room.id,
      player,
    });

    this.server.to(room.id).emit("game:turn-started", result.publicGame);

    const activeRoles =
      result.game.activeTeam === Team.TEAM_1 ? result.game.roles.team1 : result.game.roles.team2;

    this.emitWordToAllowedPlayers(
      room.id,
      result.game.activeTeam,
      activeRoles.clueGiverId,
      result.word,
    );

    const existingTimer = this.turnTimers.get(room.id);

    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      this.turnTimers.delete(room.id);

      const result = this.gameService.finishTurn(room.id);

      this.server.to(room.id).emit("game:turn-finished", result.publicGame);

      if (result.transition === "game_finished") {
        const finishedRoom = this.roomsService.finishRoom(room.id);

        this.server.to(room.id).emit("room:updated", finishedRoom);
      }

      this.scheduleGameTransition(room.id, result.transition);
    }, 30_000);

    this.turnTimers.set(room.id, timer);

    return {
      success: true,
      data: {
        game: result.publicGame,
      },
    };
  }

  @SubscribeMessage("game:correct-word")
  handleCorrectWord(@MessageBody() data: CorrectWordDto, @ConnectedSocket() client: Socket) {
    const { room, player } = this.findPlayerInRoom(data.roomId, client.id);

    const result = this.gameService.correctWord({
      roomId: room.id,
      playerId: player.id,
    });

    this.server.to(room.id).emit("game:updated", result.publicGame);

    const game = this.gameService.findGameByRoomId(room.id);

    if (!game) {
      throw new WsException("Partida não encontrada.");
    }

    const activeRoles = game.activeTeam === Team.TEAM_1 ? game.roles.team1 : game.roles.team2;

    this.emitWordToAllowedPlayers(room.id, game.activeTeam, activeRoles.clueGiverId, result.word);

    return {
      success: true,
      data: {
        game: result.publicGame,
      },
    };
  }

  @SubscribeMessage("game:skip-word")
  handleSkipWord(@MessageBody() data: SkipWordDto, @ConnectedSocket() client: Socket) {
    const { room, player } = this.findPlayerInRoom(data.roomId, client.id);

    const result = this.gameService.skipWord({
      roomId: room.id,
      playerId: player.id,
    });

    this.server.to(room.id).emit("game:updated", result.publicGame);

    const game = this.gameService.findGameByRoomId(room.id);

    if (!game) {
      throw new WsException("Partida não encontrada.");
    }

    const activeRoles = game.activeTeam === Team.TEAM_1 ? game.roles.team1 : game.roles.team2;

    this.emitWordToAllowedPlayers(room.id, game.activeTeam, activeRoles.clueGiverId, result.word);

    return {
      success: true,
      data: {
        game: result.publicGame,
      },
    };
  }

  @SubscribeMessage("room:reset-teams")
  handleResetTeams(@MessageBody() data: ResetTeamsDto, @ConnectedSocket() client: Socket) {
    const room = this.roomsService.resetTeams({
      roomId: data.roomId,
      socketId: client.id,
    });

    this.server.to(room.id).emit("room:updated", room);

    return {
      success: true,
      data: {
        room,
      },
    };
  }

  @SubscribeMessage("room:randomize-teams")
  handleRandomizeTeams(@MessageBody() data: RandomizeTeamsDto, @ConnectedSocket() client: Socket) {
    const room = this.roomsService.randomizeTeams({
      roomId: data.roomId,
      socketId: client.id,
    });

    this.server.to(room.id).emit("room:updated", room);

    return {
      success: true,
      data: {
        room,
      },
    };
  }

  @SubscribeMessage("game:rematch")
  handleRematch(@MessageBody() data: RematchDto, @ConnectedSocket() client: Socket) {
    const { room, player } = this.findPlayerInRoom(data.roomId, client.id);

    if (!player.isOwner) {
      throw new WsException("Apenas o dono pode iniciar uma nova partida.");
    }

    if (!this.gameService.isGameFinished(room.id)) {
      throw new WsException("A partida ainda não terminou.");
    }

    const updatedRoom = this.roomsService.returnToLobby({
      roomId: room.id,
      socketId: client.id,
    });

    this.gameService.deleteGame(room.id);

    this.clearRoomTimers(room.id);

    this.server.to(room.id).emit("room:returned-to-lobby", updatedRoom);

    return {
      success: true,
      data: {
        room: updatedRoom,
      },
    };
  }
}
