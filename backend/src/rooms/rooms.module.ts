import { Module } from "@nestjs/common";

import { GameModule } from "../game/game.module";
import { GameSessionCoordinatorService } from "./game-session-coordinator.service";
import { RoomConnectionService } from "./room-connection.service";
import { RoomsGateway } from "./rooms.gateway";
import { RoomsService } from "./rooms.service";

@Module({
  imports: [GameModule],
  providers: [
    RoomsGateway,
    RoomsService,
    RoomConnectionService,
    GameSessionCoordinatorService,
  ],
})
export class RoomsModule { }