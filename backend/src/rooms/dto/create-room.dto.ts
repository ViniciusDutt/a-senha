import { IsString, Length } from "class-validator";

export class CreateRoomDto {
  @IsString()
  @Length(2, 20)
  name!: string;
}
