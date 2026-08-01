import { IsString, Length, MaxLength, MinLength } from "class-validator";

export class SubmitGuessDto {
  @IsString()
  @Length(4, 4)
  roomId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(30)
  guess!: string;
}
