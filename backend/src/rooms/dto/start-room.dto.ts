import { IsString, Length } from "class-validator";

export class StartRoomDto {
  @IsString()
  @Length(4, 4)
  roomId!: string;
}
