import { IsString, Length } from "class-validator";

export class RandomizeTeamsDto {
  @IsString()
  @Length(4, 4)
  roomId!: string;
}
