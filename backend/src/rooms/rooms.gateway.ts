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

import { CorrectWordDto } from "../game/dto/correct-word.dto";
import { ReconnectGameDto } from "../game/dto/reconnect-game.dto";
import { RematchDto } from "../game/dto/rematch.dto";
import { SkipWordDto } from "../game/dto/skip-word.dto";
import { StartTurnDto } from "../game/dto/start-turn.dto";
import { SubmitClueDto } from "../game/dto/submit-clue.dto";
import { SubmitGuessDto } from "../game/dto/submit-guess.dto";
import { GameService } from "../game/game.service";
import type { Game } from "../game/types/game.type";
import type { PublicGame } from "../game/types/public-game.type";
import { CreateRoomDto } from "./dto/create-room.dto";
import { JoinRoomDto } from "./dto/join-room.dto";
import { RandomizeTeamsDto } from "./dto/randomize-teams.dto";
import { ReconnectRoomDto } from "./dto/reconnect-room.dto";
import { ResetTeamsDto } from "./dto/reset-teams.dto";
import { SelectTeamDto } from "./dto/select-team.dto";
import { StartRoomDto } from "./dto/start-room.dto";
import { UpdateRoomSettingsDto } from "./dto/update-room-settings.dto";
import { Team } from "./enums/team.enum";
import { GameSessionCoordinatorService } from "./game-session-coordinator.service";
import { RoomConnectionService } from "./room-connection.service";
import { RoomsService } from "./rooms.service";
import type { Player } from "./types/player.type";
import type { Room } from "./types/room.type";

type SuccessResponse<T> = {
  success: true;
  data: T;
};

function success<T>(data: T): SuccessResponse<T> {
  return {
    success: true,
    data,
  };
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL ?? "http://localhost:3000",
    credentials: true,
  },
})
export class RoomsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private server!: Server;

  private readonly logger = new Logger(RoomsGateway.name);

  constructor(
    private readonly roomsService: RoomsService,
    private readonly gameService: GameService,
    private readonly roomConnectionService: RoomConnectionService,
    private readonly gameSessionCoordinator: GameSessionCoordinatorService,
  ) {}

  handleConnection(client: Socket): void {
    this.logger.log(`Socket conectado: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Socket desconectado: ${client.id}`);

    this.roomConnectionService.handleDisconnect(client.id, room => {
      this.emitRoomUpdated(room);
    });
  }

  @SubscribeMessage("room:create")
  async handleCreateRoom(@MessageBody() data: CreateRoomDto, @ConnectedSocket() client: Socket) {
    const result = this.roomsService.createRoom({
      name: data.name,
      socketId: client.id,
    });

    await client.join(result.room.id);

    return success(result);
  }

  @SubscribeMessage("room:join")
  async handleJoinRoom(@MessageBody() data: JoinRoomDto, @ConnectedSocket() client: Socket) {
    const result = this.roomsService.joinRoom({
      roomId: data.roomId,
      name: data.name,
      socketId: client.id,
    });

    await client.join(result.room.id);

    this.emitRoomUpdated(result.room);

    return success(result);
  }

  @SubscribeMessage("room:reconnect")
  async handleReconnectRoom(
    @MessageBody() data: ReconnectRoomDto,
    @ConnectedSocket() client: Socket,
  ) {
    const result = this.roomConnectionService.reconnectPlayer({
      roomId: data.roomId,
      playerId: data.playerId,
      socketId: client.id,
    });

    await client.join(result.room.id);

    this.emitRoomUpdated(result.room);

    return success(result);
  }

  @SubscribeMessage("game:reconnect")
  async handleReconnectGame(
    @MessageBody() data: ReconnectGameDto,
    @ConnectedSocket() client: Socket,
  ) {
    const reconnectResult = this.roomConnectionService.reconnectPlayer({
      roomId: data.roomId,
      playerId: data.playerId,
      socketId: client.id,
    });

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

    this.emitRoomUpdated(reconnectResult.room);

    return success({
      playerId: reconnectResult.playerId,
      room: reconnectResult.room,
      game: gameResult.publicGame,
      word: gameResult.word,
    });
  }

  @SubscribeMessage("room:select-team")
  handleSelectTeam(@MessageBody() data: SelectTeamDto, @ConnectedSocket() client: Socket) {
    const room = this.roomsService.selectTeam({
      roomId: data.roomId,
      socketId: client.id,
      team: data.team,
    });

    this.emitRoomUpdated(room);

    return success({ room });
  }

  @SubscribeMessage("room:reset-teams")
  handleResetTeams(@MessageBody() data: ResetTeamsDto, @ConnectedSocket() client: Socket) {
    const room = this.roomsService.resetTeams({
      roomId: data.roomId,
      socketId: client.id,
    });

    this.emitRoomUpdated(room);

    return success({ room });
  }

  @SubscribeMessage("room:randomize-teams")
  handleRandomizeTeams(@MessageBody() data: RandomizeTeamsDto, @ConnectedSocket() client: Socket) {
    const room = this.roomsService.randomizeTeams({
      roomId: data.roomId,
      socketId: client.id,
    });

    this.emitRoomUpdated(room);

    return success({ room });
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

    this.emitRoomUpdated(room);

    return success({ room });
  }

  @SubscribeMessage("room:start")
  async handleStartRoom(@MessageBody() data: StartRoomDto, @ConnectedSocket() client: Socket) {
    const result = await this.gameSessionCoordinator.startRoom({
      roomId: data.roomId,
      socketId: client.id,
      onCountdown: roomId => {
        this.server.to(roomId).emit("game:countdown");
      },
    });

    this.server.to(result.room.id).emit("game:started", {
      room: result.room,
      game: result.game,
    });

    return success({
      room: result.room,
      game: result.game,
    });
  }

  @SubscribeMessage("game:start-turn")
  handleStartTurn(@MessageBody() data: StartTurnDto, @ConnectedSocket() client: Socket) {
    const { room, player } = this.findPlayerInRoom(data.roomId, client.id);

    const result = this.gameSessionCoordinator.startTurn({
      roomId: room.id,
      player,
      events: this.createGameSessionEvents(),
    });

    this.server.to(room.id).emit("game:turn-started", result.publicGame);

    this.deliverCurrentWord(room.id, result.game, result.word);

    return success({
      game: result.publicGame,
    });
  }

  @SubscribeMessage("game:submit-clue")
  handleSubmitClue(@MessageBody() data: SubmitClueDto, @ConnectedSocket() client: Socket) {
    const { room, player } = this.findPlayerInRoom(data.roomId, client.id);

    const result = this.gameService.submitClue({
      roomId: room.id,
      playerId: player.id,
      clue: data.clue,
    });

    this.emitGameUpdated(room.id, result.publicGame);

    return success({
      game: result.publicGame,
    });
  }

  @SubscribeMessage("game:submit-guess")
  handleSubmitGuess(@MessageBody() data: SubmitGuessDto, @ConnectedSocket() client: Socket) {
    const { room, player } = this.findPlayerInRoom(data.roomId, client.id);

    const result = this.gameService.submitGuess({
      roomId: room.id,
      playerId: player.id,
      guess: data.guess,
    });

    this.emitGameUpdated(room.id, result.publicGame);

    if (result.word) {
      this.deliverCurrentWord(room.id, result.game, result.word);
    }

    return success({
      game: result.publicGame,
      isCorrect: result.isCorrect,
    });
  }

  @SubscribeMessage("game:correct-word")
  handleCorrectWord(@MessageBody() data: CorrectWordDto, @ConnectedSocket() client: Socket) {
    const { room, player } = this.findPlayerInRoom(data.roomId, client.id);

    const result = this.gameService.correctWord({
      roomId: room.id,
      playerId: player.id,
    });

    this.emitGameUpdated(room.id, result.publicGame);

    this.server.to(room.id).emit("game:word-result", { isCorrect: true });

    this.deliverCurrentWord(room.id, result.game, result.word);

    return success({
      game: result.publicGame,
    });
  }

  @SubscribeMessage("game:skip-word")
  handleSkipWord(@MessageBody() data: SkipWordDto, @ConnectedSocket() client: Socket) {
    const { room, player } = this.findPlayerInRoom(data.roomId, client.id);

    const result = this.gameService.skipWord({
      roomId: room.id,
      playerId: player.id,
    });

    this.emitGameUpdated(room.id, result.publicGame);

    this.server.to(room.id).emit("game:word-result", { isCorrect: false });

    this.deliverCurrentWord(room.id, result.game, result.word);

    return success({
      game: result.publicGame,
    });
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

    this.gameSessionCoordinator.clearRoomTimers(room.id);

    this.server.to(room.id).emit("room:returned-to-lobby", updatedRoom);

    return success({
      room: updatedRoom,
    });
  }

  private findPlayerInRoom(
    roomId: string,
    socketId: string,
  ): {
    room: Room;
    player: Player;
  } {
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

  private emitRoomUpdated(room: Room): void {
    this.server.to(room.id).emit("room:updated", room);
  }

  private emitGameUpdated(roomId: string, game: PublicGame): void {
    this.server.to(roomId).emit("game:updated", game);
  }

  private deliverCurrentWord(roomId: string, game: Game, word: string): void {
    const activeRoles = this.getActiveRoles(game);

    this.gameSessionCoordinator.deliverWordToAllowedPlayers({
      roomId,
      activeTeam: game.activeTeam,
      clueGiverId: activeRoles.clueGiverId,
      word,
      onDeliver: (socketId, payload) => {
        this.server.to(socketId).emit("game:word", payload);
      },
    });
  }

  private getActiveRoles(game: Game) {
    return game.activeTeam === Team.TEAM_1 ? game.roles.team1 : game.roles.team2;
  }

  private createGameSessionEvents() {
    return {
      onGameUpdated: (roomId: string, game: PublicGame) => {
        this.emitGameUpdated(roomId, game);
      },

      onTurnFinished: (roomId: string, game: PublicGame) => {
        this.server.to(roomId).emit("game:turn-finished", game);
      },

      onRoomUpdated: (room: Room) => {
        this.emitRoomUpdated(room);
      },
    };
  }
}
