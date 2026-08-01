import { IsString, Length } from "class-validator";

export class SkipWordDto {
  @IsString()
  @Length(4, 4)
  roomId!: string;
}
