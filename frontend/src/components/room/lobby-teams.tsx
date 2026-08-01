import { TeamPanel } from "@/components/room/team-panel";
import type { Player, Room, Team } from "@/types/room";

type LobbyTeamsProps = {
  room: Room;
  team1Players: Player[];
  team2Players: Player[];
  onSelectTeam: (team: Team) => void;
};

export function LobbyTeams({
  room,
  team1Players,
  team2Players,
  onSelectTeam,
}: LobbyTeamsProps) {
  return (
    <div className="flex w-full flex-col items-center gap-6 lg:absolute lg:left-1/2 lg:top-1/2 lg:max-w-122 lg:-translate-x-1/2 lg:-translate-y-1/2">
      <TeamPanel
        title="Time 1"
        team="team1"
        players={team1Players}
        allPlayers={room.players}
        roomStatus={room.status}
        backgroundClassName="bg-chart-2"
        buttonClassName="aspect-square bg-primary shadow-[0_4px_0_#9a003a]"
        onSelectTeam={onSelectTeam}
      />

      <span className="text-5xl" aria-hidden="true">
        ⚔️
      </span>

      <TeamPanel
        title="Time 2"
        team="team2"
        players={team2Players}
        allPlayers={room.players}
        roomStatus={room.status}
        backgroundClassName="bg-primary"
        buttonClassName="aspect-square bg-chart-2 shadow-[0_4px_0_#004995]"
        onSelectTeam={onSelectTeam}
      />
    </div>
  );
}
