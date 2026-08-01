import { Logger } from "@nestjs/common";
import {
  ConnectedSocket,
  MessageBody,
  type OnGatewayConnection,
  type OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import type { Server, Socket } from "socket.io";
import { CreateRoomDto } from "./dto/create-room.dto";
import { JoinRoomDto } from "./dto/join-room.dto";
import { ReconnectRoomDto } from "./dto/reconnect-room.dto";
import { SelectTeamDto } from "./dto/select-team.dto";
import { StartRoomDto } from "./dto/start-room.dto";
import { UpdateRoomSettingsDto } from "./dto/update-room-settings.dto";
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

  constructor(private readonly roomsService: RoomsService) {}

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
  handleStartRoom(@MessageBody() data: StartRoomDto, @ConnectedSocket() client: Socket) {
    const room = this.roomsService.startRoom({
      roomId: data.roomId,
      socketId: client.id,
    });

    this.server.to(room.id).emit("game:started", room);

    return {
      success: true,
      data: {
        room,
      },
    };
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
}
