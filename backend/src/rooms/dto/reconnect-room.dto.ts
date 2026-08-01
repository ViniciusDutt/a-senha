import { IsString, IsUUID, Length } from "class-validator";

export class ReconnectRoomDto {
  @IsString()
  @Length(4, 4)
  roomId!: string;

  @IsUUID()
  playerId!: string;
}
