import { IsEnum, IsString, Length } from "class-validator";
import { Team } from "../enums/team.enum";

export class SelectTeamDto {
  @IsString()
  @Length(4, 4)
  roomId!: string;

  @IsEnum(Team)
  team!: Team;
}
