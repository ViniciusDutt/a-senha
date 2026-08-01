import { IsString, Length } from "class-validator";

export class CorrectWordDto {
  @IsString()
  @Length(4, 4)
  roomId!: string;
}
