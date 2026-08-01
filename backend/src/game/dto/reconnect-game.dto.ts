import { IsString, IsUUID, Length } from "class-validator";

export class ReconnectGameDto {
  @IsString()
  @Length(4, 4)
  roomId!: string;

  @IsUUID()
  playerId!: string;
}
