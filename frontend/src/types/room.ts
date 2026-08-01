import type { Game } from "./game";

export type Team = "team1" | "team2";

export type RoomStatus = "lobby" | "playing" | "finished";

export type Player = {
  id: string;
  socketId: string;
  name: string;
  team: Team | null;
  isOwner: boolean;
  isConnected: boolean;
};

export type Room = {
  id: string;
  ownerId: string;
  status: RoomStatus;
  players: Player[];
  settings: {
    chatEnabled: boolean;
  };
  createdAt: string;
};

export type CreateRoomResponse =
  | {
      success: true;
      data: {
        playerId: string;
        room: Room;
      };
    }
  | {
      success: false;
      message: string;
    };

export type SelectTeamResponse =
  | {
      success: true;
      data: {
        room: Room;
      };
    }
  | {
      success: false;
      message: string;
    };

export type JoinRoomResponse =
  | {
      success: true;
      data: {
        playerId: string;
        room: Room;
      };
    }
  | {
      success: false;
      message: string;
    };

export type ReconnectRoomResponse =
  | {
      success: true;
      data: {
        playerId: string;
        room: Room;
      };
    }
  | {
      success: false;
      message: string;
    };

export type StartRoomResponse =
  | {
      success: true;
      data: {
        room: Room;
        game: Game;
      };
    }
  | {
      success: false;
      message: string;
    };

export type UpdateRoomSettingsResponse =
  | {
      success: true;
      data: {
        room: Room;
      };
    }
  | {
      success: false;
      message: string;
    };

export type UpdateTeamsResponse =
  | {
      success: true;
      data: {
        room: Room;
      };
    }
  | {
      success: false;
      message: string;
    };
