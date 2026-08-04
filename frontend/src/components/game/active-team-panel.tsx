import type { Player, Team } from "@/types/room";
import { getTeamName } from "@/utils/game-display";
import { Button } from "../ui/button";

type ActiveTeamPanelProps = {
  activeTeam: Team;
  activeTeamPlayers: Player[];
  clueGiver: Player | undefined;
  guesser: Player | undefined;
  isActiveTeam: boolean;
  isClueGiver: boolean;
  isGuesser: boolean;
  isStartingTurn: boolean;
  onStartTurn: () => void;
};

export function ActiveTeamPanel({
  activeTeam,
  activeTeamPlayers,
  clueGiver,
  guesser,
  isActiveTeam,
  isClueGiver,
  isGuesser,
  isStartingTurn,
  onStartTurn
}: ActiveTeamPanelProps) {
  const playerMessage = getPlayerMessage({
    isActiveTeam,
    isClueGiver,
    isGuesser,
    clueGiver,
    guesser,
  });

  return (
    <section className="rounded-2xl bg-black/50 p-6 text-center">
      <p className="text-sm text-white/60">Vez do {getTeamName(activeTeam)}</p>

      <h1 className="mt-2 font-bold text-2xl">{playerMessage}</h1>

      <div className="mt-6 flex justify-center gap-4">
        {activeTeamPlayers.map((player) => (
          <div key={player.id} className="rounded-xl bg-white/10 px-5 py-3">
            <p className="font-semibold">{player.name}</p>

            <p className="text-sm text-white/50">
              {player.id === clueGiver?.id ? "Dá as dicas" : "Adivinha"}
            </p>
          </div>
        ))}
      </div>

      {isClueGiver && (
        <Button
          type="button"
          size="lg"
          disabled={isStartingTurn}
          onClick={onStartTurn}
          className="mt-6"
        >
          {isStartingTurn ? "Iniciando..." : "Começar turno"}
        </Button>
      )}
    </section>
  );
}

type GetPlayerMessageParams = {
  isActiveTeam: boolean;
  isClueGiver: boolean;
  isGuesser: boolean;
  clueGiver: Player | undefined;
  guesser: Player | undefined;
};

function getPlayerMessage({
  isActiveTeam,
  isClueGiver,
  isGuesser,
  clueGiver,
  guesser,
}: GetPlayerMessageParams): string {
  if (isClueGiver) {
    return "Você dará as dicas";
  }

  if (isGuesser) {
    return "Você tentará descobrir as senhas";
  }

  if (!isActiveTeam) {
    return `${clueGiver?.name ?? "O jogador"} dará dicas para ${guesser?.name ?? "seu parceiro"
      }`;
  }

  return "Aguarde o início do turno";
}
