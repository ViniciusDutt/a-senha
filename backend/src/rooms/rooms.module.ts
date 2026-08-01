import { Module } from "@nestjs/common";
import { GameModule } from "../game/game.module";
import { RoomsGateway } from "./rooms.gateway";
import { RoomsService } from "./rooms.service";

@Module({
  imports: [GameModule],
  providers: [RoomsGateway, RoomsService],
})
export class RoomsModule {}
