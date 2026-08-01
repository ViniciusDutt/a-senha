"use client";

import { Loader2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Sunbeam } from "@/components/ui/sunbeam";
import { socket } from "@/lib/socket";
import type {
  ChangeWordResponse,
  Game,
  GameWordPayload,
  ReconnectGameResponse,
  RematchResponse,
  StartTurnResponse,
} from "@/types/game";
import type { Player, Room, Team } from "@/types/room";

export default function GamePage() {
  const { roomId } = useParams<{ roomId: string }>();
  const router = useRouter();

  const [timeLeft, setTimeLeft] = useState(0);
  const [currentWord, setCurrentWord] = useState<string | null>(null);
  const [isChangingWord, setIsChangingWord] = useState(false);
  const [isStartingTurn, setIsStartingTurn] = useState(false);
  const [room, setRoom] = useState<Room | null>(null);
  const [game, setGame] = useState<Game | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isReturningToLobby, setIsReturningToLobby] = useState(false);

  useEffect(() => {
    const storedPlayerId = sessionStorage.getItem(`room:${roomId}:playerId`);

    if (!storedPlayerId) {
      router.replace(`/room/${roomId}`);
      return;
    }

    function saveGame(updatedGame: Game) {
      setGame(updatedGame);

      sessionStorage.setItem(
        `room:${roomId}:game`,
        JSON.stringify(updatedGame),
      );
    }

    function handleTurnStarted(updatedGame: Game) {
      saveGame(updatedGame);
      setCurrentWord(null);
      setIsStartingTurn(false);
      setIsChangingWord(false);
    }

    function handleWord({ word }: GameWordPayload) {
      setCurrentWord(word);
      setIsChangingWord(false);
    }

    function handleTurnFinished(updatedGame: Game) {
      saveGame(updatedGame);
      setCurrentWord(null);
      setIsStartingTurn(false);
      setIsChangingWord(false);
    }

    function handleGameUpdated(updatedGame: Game) {
      saveGame(updatedGame);
    }

    function handleReturnedToLobby(updatedRoom: Room) {
      sessionStorage.setItem(
        `room:${updatedRoom.id}:state`,
        JSON.stringify(updatedRoom),
      );

      sessionStorage.removeItem(`room:${updatedRoom.id}:game`);

      router.replace(`/room/${updatedRoom.id}`);
    }

    function reconnectGame() {
      socket.emit(
        "game:reconnect",
        {
          roomId,
          playerId: storedPlayerId,
        },
        (response: ReconnectGameResponse) => {
          if (!response.success) {
            sessionStorage.removeItem(`room:${roomId}:state`);

            sessionStorage.removeItem(`room:${roomId}:game`);

            sessionStorage.removeItem(`room:${roomId}:playerId`);

            router.replace(`/room/${roomId}`);
            return;
          }

          const {
            room: updatedRoom,
            game: updatedGame,
            playerId: reconnectedPlayerId,
            word,
          } = response.data;

          setRoom(updatedRoom);
          setGame(updatedGame);
          setPlayerId(reconnectedPlayerId);
          setCurrentWord(word);
          setHasLoaded(true);

          sessionStorage.setItem(
            `room:${roomId}:state`,
            JSON.stringify(updatedRoom),
          );

          sessionStorage.setItem(
            `room:${roomId}:game`,
            JSON.stringify(updatedGame),
          );

          sessionStorage.setItem(
            `room:${roomId}:playerId`,
            reconnectedPlayerId,
          );
        },
      );
    }

    socket.on("game:turn-started", handleTurnStarted);

    socket.on("game:word", handleWord);

    socket.on("game:turn-finished", handleTurnFinished);

    socket.on("game:updated", handleGameUpdated);

    socket.on("room:returned-to-lobby", handleReturnedToLobby);

    if (socket.connected) {
      reconnectGame();
    } else {
      socket.connect();
      socket.once("connect", reconnectGame);
    }

    return () => {
      socket.off("game:turn-started", handleTurnStarted);

      socket.off("game:word", handleWord);

      socket.off("game:turn-finished", handleTurnFinished);

      socket.off("game:updated", handleGameUpdated);

      socket.off("room:returned-to-lobby", handleReturnedToLobby);

      socket.off("connect", reconnectGame);
    };
  }, [roomId, router]);

  useEffect(() => {
    if (game?.phase !== "playing" || !game.turnEndsAt) {
      setTimeLeft(0);
      return;
    }

    function updateTimer() {
      const endsAt = new Date(game?.turnEndsAt as string).getTime();
      const remainingMilliseconds = endsAt - Date.now();

      const remainingSeconds = Math.max(
        0,
        Math.ceil(remainingMilliseconds / 1000),
      );

      setTimeLeft(remainingSeconds);
    }

    updateTimer();

    const interval = window.setInterval(updateTimer, 250);

    return () => {
      window.clearInterval(interval);
    };
  }, [game?.phase, game?.turnEndsAt]);

  function handleRematch() {
    if (
      !socket.connected ||
      !isOwner ||
      game?.phase !== "game_finished" ||
      isReturningToLobby
    ) {
      return;
    }

    setIsReturningToLobby(true);

    socket.emit(
      "game:rematch",
      {
        roomId,
      },
      (response: RematchResponse) => {
        if (!response.success) {
          setIsReturningToLobby(false);
        }
      },
    );
  }

  function handleStartTurn() {
    if (!socket.connected || isStartingTurn || game?.phase !== "waiting_turn") {
      return;
    }

    setIsStartingTurn(true);

    socket.emit(
      "game:start-turn",
      {
        roomId,
      },
      (response: StartTurnResponse) => {
        if (!response.success) {
          setIsStartingTurn(false);
          return;
        }

        const updatedGame = response.data.game;

        setGame(updatedGame);

        sessionStorage.setItem(
          `room:${roomId}:game`,
          JSON.stringify(updatedGame),
        );
      },
    );
  }

  function handleChangeWord(event: "game:correct-word" | "game:skip-word") {
    if (!socket.connected || isChangingWord || game?.phase !== "playing") {
      return;
    }

    setIsChangingWord(true);

    socket.emit(
      event,
      {
        roomId,
      },
      (response: ChangeWordResponse) => {
        setIsChangingWord(false);

        if (!response.success) {
          return;
        }

        const updatedGame = response.data.game;

        setGame(updatedGame);

        sessionStorage.setItem(
          `room:${roomId}:game`,
          JSON.stringify(updatedGame),
        );
      },
    );
  }

  function handleCorrectWord() {
    handleChangeWord("game:correct-word");
  }

  function handleSkipWord() {
    handleChangeWord("game:skip-word");
  }

  if (!hasLoaded || !room || !game || !playerId) {
    return (
      <main className="relative flex h-dvh items-center justify-center overflow-hidden">
        <Loader2 className="size-8 animate-spin" />
        <Sunbeam />
      </main>
    );
  }

  const currentPlayer = room.players.find((player) => player.id === playerId);

  if (!currentPlayer) {
    return null;
  }

  const activeTeamPlayers = getTeamPlayers(room.players, game.activeTeam);

  const activeRoles =
    game.activeTeam === "team1" ? game.roles.team1 : game.roles.team2;

  const clueGiver = room.players.find(
    (player) => player.id === activeRoles.clueGiverId,
  );

  const guesser = room.players.find(
    (player) => player.id === activeRoles.guesserId,
  );

  const isActiveTeam = currentPlayer.team === game.activeTeam;
  const isClueGiver = currentPlayer.id === activeRoles.clueGiverId;
  const isGuesser = currentPlayer.id === activeRoles.guesserId;
  const canSeeWord = isClueGiver || !isActiveTeam;
  const isOwner = currentPlayer.isOwner;

  return (
    <main className="relative flex min-h-dvh flex-col items-center overflow-hidden p-4">
      <div className="z-10 flex w-full max-w-3xl flex-col gap-6">
        <GameHeader game={game} />

        <Scoreboard game={game} />

        <section className="rounded-2xl bg-black/50 p-6 text-center">
          <p className="text-sm text-white/60">
            Vez do {getTeamName(game.activeTeam)}
          </p>

          <h1 className="mt-2 font-bold text-3xl">
            {getPlayerMessage({
              isActiveTeam,
              isClueGiver,
              isGuesser,
              clueGiver,
              guesser,
            })}
          </h1>

          <div className="mt-6 flex justify-center gap-4">
            {activeTeamPlayers.map((player) => (
              <div key={player.id} className="rounded-xl bg-white/10 px-5 py-3">
                <p className="font-semibold">{player.name}</p>

                <p className="text-sm text-white/50">
                  {player.id === activeRoles.clueGiverId
                    ? "Dá as dicas"
                    : "Adivinha"}
                </p>
              </div>
            ))}
          </div>
        </section>

        {game.phase === "waiting_turn" && (
          <section className="flex flex-col items-center gap-4 rounded-2xl bg-black/50 p-6">
            <p className="text-center text-white/70">
              O turno ainda não começou.
            </p>

            {isClueGiver && (
              <Button
                type="button"
                size="lg"
                disabled={isStartingTurn}
                onClick={handleStartTurn}
              >
                {isStartingTurn ? "Iniciando..." : "Começar turno"}
              </Button>
            )}
          </section>
        )}

        {game.phase === "playing" && (
          <section className="rounded-2xl bg-black/50 p-6 text-center">
            <div className="mb-6 flex justify-center">
              <div className="flex size-24 items-center justify-center rounded-full border-4 border-white/20 bg-black/30">
                <span className="font-black text-4xl">{timeLeft}</span>
              </div>
            </div>

            {canSeeWord ? (
              <>
                <p className="text-sm text-white/60">
                  {isClueGiver ? "A senha é" : "Senha da dupla adversária"}
                </p>

                <h2 className="mt-3 font-black text-5xl uppercase">
                  {currentWord ?? ""}
                </h2>

                {isClueGiver && (
                  <div className="mt-8 grid grid-cols-2 gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      disabled={isChangingWord || !currentWord}
                      onClick={handleSkipWord}
                    >
                      Pular
                    </Button>

                    <Button
                      type="button"
                      size="lg"
                      disabled={isChangingWord || !currentWord}
                      onClick={handleCorrectWord}
                    >
                      Acertou
                    </Button>
                  </div>
                )}
              </>
            ) : isGuesser ? (
              <>
                <p className="text-sm text-white/60">
                  Seu parceiro já recebeu a senha
                </p>

                <h2 className="mt-3 font-bold text-3xl">Aguarde a dica</h2>
              </>
            ) : null}
          </section>
        )}

        {game.phase === "turn_finished" && (
          <section className="rounded-2xl bg-black/50 p-6 text-center">
            <p className="text-sm text-white/60">Turno encerrado</p>

            <h2 className="mt-2 font-black text-4xl">
              {getTeamName(game.activeTeam)} acertou{" "}
              {game.activeTeam === "team1"
                ? game.turnScores.team1
                : game.turnScores.team2}
            </h2>

            <p className="mt-4 text-white/60">Preparando o próximo time...</p>
          </section>
        )}

        {game.phase === "round_finished" && (
          <section className="rounded-2xl bg-black/50 p-6 text-center">
            <p className="text-sm text-white/60">
              Rodada {game.round} encerrada
            </p>

            <h2 className="mt-2 font-black text-4xl">
              {game.roundWinner
                ? `${getTeamName(game.roundWinner)} venceu`
                : "A rodada terminou empatada"}
            </h2>

            <p className="mt-4 text-white/60">
              Placar: {game.turnScores.team1} × {game.turnScores.team2}
            </p>

            <p className="mt-2 text-white/60">Preparando a próxima rodada...</p>
          </section>
        )}

        {game.phase === "game_finished" && (
          <section className="rounded-2xl bg-black/50 p-8 text-center">
            <p className="text-sm text-white/60">Partida encerrada</p>

            <h1 className="mt-3 font-black text-5xl">
              {game.winner
                ? `${getTeamName(game.winner)} venceu!`
                : "A partida terminou empatada!"}
            </h1>

            <p className="mt-4 text-xl text-white/70">
              {game.roundsWon.team1} × {game.roundsWon.team2}
            </p>

            {isOwner ? (
              <Button
                type="button"
                size="lg"
                className="mt-8"
                disabled={isReturningToLobby}
                onClick={handleRematch}
              >
                {isReturningToLobby ? "Voltando..." : "Jogar novamente"}
              </Button>
            ) : (
              <p className="mt-8 text-white/60">Aguardando o dono da sala...</p>
            )}
          </section>
        )}
      </div>

      <Sunbeam />
    </main>
  );
}

type GameHeaderProps = {
  game: Game;
};

function GameHeader({ game }: GameHeaderProps) {
  const isTiebreaker = game.round > game.totalRounds;

  return (
    <header className="flex items-center justify-between rounded-2xl bg-black/50 p-4">
      <div>
        <p className="text-sm text-white/50">
          {isTiebreaker ? "Desempate" : "Rodada"}
        </p>

        <p className="font-bold text-2xl">
          {isTiebreaker
            ? `Extra ${game.round - game.totalRounds}`
            : `${game.round}/${game.totalRounds}`}
        </p>
      </div>

      <div className="text-right">
        <p className="text-sm text-white/50">Jogando agora</p>

        <p className="font-bold text-xl">{getTeamName(game.activeTeam)}</p>
      </div>
    </header>
  );
}

type ScoreboardProps = {
  game: Game;
};

function Scoreboard({ game }: ScoreboardProps) {
  return (
    <section className="grid grid-cols-2 gap-4">
      <div className="rounded-2xl bg-chart-2 p-5 text-center">
        <p className="font-semibold">Time 1</p>

        <p className="font-black text-4xl">{game.roundsWon.team1}</p>

        <p className="text-sm text-white/70">
          {game.turnScores.team1} acertos na rodada
        </p>
      </div>

      <div className="rounded-2xl bg-primary p-5 text-center">
        <p className="font-semibold">Time 2</p>

        <p className="font-black text-4xl">{game.roundsWon.team2}</p>

        <p className="text-sm text-white/70">
          {game.turnScores.team2} acertos na rodada
        </p>
      </div>
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
    return `${clueGiver?.name ?? "O jogador"} dará dicas para ${
      guesser?.name ?? "seu parceiro"
    }`;
  }

  return "Aguarde o início do turno";
}

function getTeamPlayers(players: Player[], team: Team): Player[] {
  return players.filter((player) => player.team === team);
}

function getTeamName(team: Team): string {
  return team === "team1" ? "Time 1" : "Time 2";
}
