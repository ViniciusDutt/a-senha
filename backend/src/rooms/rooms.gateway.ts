import { Logger } from "@nestjs/common";
import {
  ConnectedSocket,
  MessageBody,
  type OnGatewayConnection,
  type OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
} from "@nestjs/websockets";
import type { Socket } from "socket.io";
import { CreateRoomDto } from "./dto/create-room.dto";
import { RoomsService } from "./rooms.service";

@WebSocketGateway({
  cors: {
    origin: "http://localhost:3000",
  },
})
export class RoomsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RoomsGateway.name);

  constructor(private readonly roomsService: RoomsService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Socket conectado: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Socket desconectado: ${client.id}`);
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
}
