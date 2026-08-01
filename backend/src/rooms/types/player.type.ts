import type { Team } from "../enums/team.enum";

export type Player = {
  id: string;
  socketId: string;
  name: string;
  team: Team | null;
  isOwner: boolean;
  isConnected: boolean;
};
