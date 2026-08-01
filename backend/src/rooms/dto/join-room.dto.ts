import { IsString, Length } from "class-validator";

export class JoinRoomDto {
  @IsString()
  @Length(4, 4)
  roomId!: string;

  @IsString()
  @Length(2, 20)
  name!: string;
}
