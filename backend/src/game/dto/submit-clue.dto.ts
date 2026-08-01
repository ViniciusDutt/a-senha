import { IsString, Length, MaxLength, MinLength } from "class-validator";

export class SubmitClueDto {
  @IsString()
  @Length(4, 4)
  roomId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(30)
  clue!: string;
}
