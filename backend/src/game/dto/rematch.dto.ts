import { IsString, Length } from "class-validator";

export class RematchDto {
  @IsString()
  @Length(4, 4)
  roomId!: string;
}
