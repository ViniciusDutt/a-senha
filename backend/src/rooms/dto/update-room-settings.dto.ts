import { IsBoolean, IsString, Length } from "class-validator";

export class UpdateRoomSettingsDto {
  @IsString()
  @Length(4, 4)
  roomId!: string;

  @IsBoolean()
  chatEnabled!: boolean;
}
