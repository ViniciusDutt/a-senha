import { IsString, Length } from "class-validator";

export class StartTurnDto {
  @IsString()
  @Length(4, 4)
  roomId!: string;
}
