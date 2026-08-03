"use client";

import { Loader2 } from "lucide-react";
import { useParams } from "next/navigation";

import { ActiveTeamPanel } from "@/components/game/active-team-panel";
import { GameFinishedPanel } from "@/components/game/game-finished-panel";
import { GameHeader } from "@/components/game/game-header";
import { GameScoreboard } from "@/components/game/game-scoreboard";
import { PlayingTurnPanel } from "@/components/game/playing-turn-panel";
import { RoundFinishedPanel } from "@/components/game/round-finished-panel";
import { TurnFinishedPanel } from "@/components/game/turn-finished-panel";
import { WaitingTurnPanel } from "@/components/game/waiting-turn-panel";
import { WordResultFlash } from "@/components/game/word-result-flash";
import { Sunbeam } from "@/components/ui/sunbeam";
import { useGameRoom } from "@/hooks/use-game-room";

export default function GamePage() {
  const { roomId } = useParams<{ roomId: string }>();

  const {
    room,
    game,
    currentPlayer,

    activeTeamPlayers,
    clueGiver,
    guesser,

    hasLoaded,
    timeLeft,
    currentWord,

    isActiveTeam,
    isClueGiver,
    isGuesser,
    canSeeWord,
    isOwner,

    clueInput,
    guessInput,
    inputError,

    isStartingTurn,
    isChangingWord,
    isSubmittingClue,
    isSubmittingGuess,
    isReturningToLobby,

    changeClueInput,
    changeGuessInput,

    startTurn,
    skipWord,
    correctWord,
    submitClue,
    submitGuess,
    requestRematch,
  } = useGameRoom(roomId);

  if (!hasLoaded || !room || !game || !currentPlayer) {
    return (
      <main className="relative flex h-dvh items-center justify-center overflow-hidden">
        <Loader2 className="size-8 animate-spin" />
        <Sunbeam />
      </main>
    );
  }

  return (
    <main className="relative flex min-h-dvh flex-col items-center overflow-hidden p-4">
      <WordResultFlash />

      <div className="z-10 flex w-full max-w-3xl flex-col gap-6">
        <GameHeader game={game} />

        <GameScoreboard game={game} />

        <ActiveTeamPanel
          activeTeam={game.activeTeam}
          activeTeamPlayers={activeTeamPlayers}
          clueGiver={clueGiver}
          guesser={guesser}
          isActiveTeam={isActiveTeam}
          isClueGiver={isClueGiver}
          isGuesser={isGuesser}
        />

        {game.phase === "waiting_turn" && (
          <WaitingTurnPanel
            isClueGiver={isClueGiver}
            isStartingTurn={isStartingTurn}
            onStartTurn={startTurn}
          />
        )}

        {game.phase === "playing" && (
          <PlayingTurnPanel
            game={game}
            players={{
              clueGiver,
              guesser,
            }}
            role={{
              isActiveTeam,
              isClueGiver,
              isGuesser,
              canSeeWord,
            }}
            turn={{
              timeLeft,
              currentWord,
              isChangingWord,
            }}
            textInput={{
              clueInput,
              guessInput,
              inputError,
              isSubmittingClue,
              isSubmittingGuess,
            }}
            actions={{
              onClueInputChange: changeClueInput,
              onGuessInputChange: changeGuessInput,
              onSubmitClue: submitClue,
              onSubmitGuess: submitGuess,
              onSkipWord: skipWord,
              onCorrectWord: correctWord,
            }}
          />
        )}

        {game.phase === "turn_finished" && <TurnFinishedPanel game={game} />}

        {game.phase === "round_finished" && <RoundFinishedPanel game={game} />}

        {game.phase === "game_finished" && (
          <GameFinishedPanel
            game={game}
            isOwner={isOwner}
            isReturningToLobby={isReturningToLobby}
            onRematch={requestRematch}
          />
        )}
      </div>

      <Sunbeam />
    </main>
  );
}
