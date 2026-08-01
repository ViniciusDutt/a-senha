import { IsString, Length } from "class-validator";

export class ResetTeamsDto {
  @IsString()
  @Length(4, 4)
  roomId!: string;
}
