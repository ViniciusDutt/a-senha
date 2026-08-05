"use client";

import type { FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Game } from "@/types/game";
import type { Player } from "@/types/room";

type PlayingTurnPanelPlayers = {
  clueGiver: Player | undefined;
  guesser: Player | undefined;
};

type PlayingTurnPanelRole = {
  isActiveTeam: boolean;
  isClueGiver: boolean;
  isGuesser: boolean;
  canSeeWord: boolean;
};

type PlayingTurnPanelTurn = {
  timeLeft: number;
  currentWord: string | null;
  isChangingWord: boolean;
};

type PlayingTurnPanelTextInput = {
  clueInput: string;
  guessInput: string;
  inputError: string | null;
  isSubmittingClue: boolean;
  isSubmittingGuess: boolean;
};

type PlayingTurnPanelActions = {
  onClueInputChange: (value: string) => void;
  onGuessInputChange: (value: string) => void;
  onSubmitClue: () => void;
  onSubmitGuess: () => void;
  onSkipWord: () => void;
  onCorrectWord: () => void;
};

type PlayingTurnPanelProps = {
  game: Game;
  players: PlayingTurnPanelPlayers;
  role: PlayingTurnPanelRole;
  turn: PlayingTurnPanelTurn;
  textInput: PlayingTurnPanelTextInput;
  actions: PlayingTurnPanelActions;
};

export function PlayingTurnPanel({
  game,
  players,
  role,
  turn,
  textInput,
  actions,
}: PlayingTurnPanelProps) {
  const { clueGiver, guesser } = players;

  const { isActiveTeam, isClueGiver, isGuesser, canSeeWord } = role;

  const { currentWord, isChangingWord } = turn;

  const {
    clueInput,
    guessInput,
    inputError,
    isSubmittingClue,
    isSubmittingGuess,
  } = textInput;

  const {
    onClueInputChange,
    onGuessInputChange,
    onSubmitClue,
    onSubmitGuess,
    onSkipWord,
    onCorrectWord,
  } = actions;

  function handleClueFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmitClue();
  }

  function handleGuessFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmitGuess();
  }

  return (
    <section className="rounded-2xl bg-black/50 p-6 text-center">
      <WordDisplay
        game={game}
        currentWord={currentWord}
        canSeeWord={canSeeWord}
        isClueGiver={isClueGiver}
      />

      {game.inputModeEnabled && <TextTurnHistory game={game} />}

      {game.inputModeEnabled &&
        isClueGiver &&
        game.turnInputPhase === "waiting_clue" && (
          <ClueInputForm
            clueInput={clueInput}
            inputError={inputError}
            currentWord={currentWord}
            isSubmittingClue={isSubmittingClue}
            isChangingWord={isChangingWord}
            onClueInputChange={onClueInputChange}
            onSubmit={handleClueFormSubmit}
            onSkipWord={onSkipWord}
          />
        )}

      {game.inputModeEnabled &&
        isClueGiver &&
        game.turnInputPhase === "waiting_guess" && (
          <p className="mt-6 text-white/60">
            Aguardando o palpite de {guesser?.name ?? "seu parceiro"}...
          </p>
        )}

      {game.inputModeEnabled &&
        isGuesser &&
        game.turnInputPhase === "waiting_guess" && (
          <GuessInputForm
            guessInput={guessInput}
            inputError={inputError}
            isSubmittingGuess={isSubmittingGuess}
            onGuessInputChange={onGuessInputChange}
            onSubmit={handleGuessFormSubmit}
          />
        )}

      {game.inputModeEnabled &&
        isGuesser &&
        game.turnInputPhase === "waiting_clue" && (
          <p className="mt-6 text-white/60">
            Aguardando a dica de {clueGiver?.name ?? "seu parceiro"}...
          </p>
        )}

      {game.inputModeEnabled && !isActiveTeam && (
        <p className="mt-6 text-white/60">
          Acompanhe as dicas e os palpites da dupla.
        </p>
      )}

      {!game.inputModeEnabled && isClueGiver && (
        <ManualTurnControls
          currentWord={currentWord}
          isChangingWord={isChangingWord}
          onSkipWord={onSkipWord}
          onCorrectWord={onCorrectWord}
        />
      )}
    </section>
  );
}

type WordDisplayProps = {
  game: Game;
  currentWord: string | null;
  canSeeWord: boolean;
  isClueGiver: boolean;
};

function WordDisplay({
  game,
  currentWord,
  canSeeWord,
  isClueGiver,
}: WordDisplayProps) {
  if (canSeeWord) {
    return (
      <>
        <p className="text-sm text-white/60">
          {isClueGiver ? "A senha é" : "Senha da dupla adversária"}
        </p>

        <h2 className="mt-3 font-black text-3xl uppercase">
          {currentWord ?? ""}
        </h2>
      </>
    );
  }

  return (
    <>
      <p className="text-sm text-white/60">Seu parceiro já recebeu a senha</p>

      <h2 className="mt-3 font-bold text-3xl">
        {getGuesserStatusMessage(game)}
      </h2>
    </>
  );
}

function getGuesserStatusMessage(game: Game): string {
  if (!game.inputModeEnabled) {
    return "Aguarde a dica";
  }

  return game.turnInputPhase === "waiting_clue"
    ? "Aguarde a dica"
    : "Envie seu palpite";
}

type TextTurnHistoryProps = {
  game: Game;
};

function TextTurnHistory({ game }: TextTurnHistoryProps) {
  if (!game.currentClue && !game.lastGuess) {
    return null;
  }

  return (
    <div className="mt-6 space-y-3">
      {game.currentClue && (
        <div className="rounded-xl bg-white/10 p-4">
          <p className="text-sm text-white/50">Dica</p>

          <p className="mt-1 font-bold text-2xl uppercase">
            {game.currentClue}
          </p>
        </div>
      )}

      {game.lastGuess && (
        <div className="rounded-xl bg-white/10 p-4">
          <p className="text-sm text-white/50">Palpite</p>

          <p className="mt-1 font-bold text-2xl uppercase">{game.lastGuess}</p>

          {game.lastGuessResult && (
            <p className="mt-2 font-semibold">
              {game.lastGuessResult === "correct" ? "Acertou!" : "Errou!"}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

type ClueInputFormProps = {
  clueInput: string;
  inputError: string | null;
  currentWord: string | null;
  isSubmittingClue: boolean;
  isChangingWord: boolean;
  onClueInputChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSkipWord: () => void;
};

function ClueInputForm({
  clueInput,
  inputError,
  currentWord,
  isSubmittingClue,
  isChangingWord,
  onClueInputChange,
  onSubmit,
  onSkipWord,
}: ClueInputFormProps) {
  return (
    <form className="mt-6 space-y-3" onSubmit={onSubmit}>
      <p className="text-sm text-white/60">
        Digite uma dica de apenas uma palavra
      </p>

      <div className="flex gap-2">
        <Input
          value={clueInput}
          maxLength={30}
          autoComplete="off"
          autoFocus
          disabled={isSubmittingClue || isChangingWord}
          placeholder="Digite a dica"
          onChange={(event) => {
            onClueInputChange(event.target.value);
          }}
        />

        <Button
          type="submit"
          disabled={
            isSubmittingClue || isChangingWord || clueInput.trim().length === 0
          }
        >
          {isSubmittingClue ? "Enviando..." : "Enviar"}
        </Button>
      </div>

      {inputError && <p className="text-destructive text-sm">{inputError}</p>}

      <Button
        type="button"
        variant="outline"
        disabled={isChangingWord || !currentWord}
        onClick={onSkipWord}
      >
        {isChangingWord ? "Pulando..." : "Pular"}
      </Button>
    </form>
  );
}

type GuessInputFormProps = {
  guessInput: string;
  inputError: string | null;
  isSubmittingGuess: boolean;
  onGuessInputChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

function GuessInputForm({
  guessInput,
  inputError,
  isSubmittingGuess,
  onGuessInputChange,
  onSubmit,
}: GuessInputFormProps) {
  return (
    <form className="mt-6 space-y-3" onSubmit={onSubmit}>
      <p className="text-sm text-white/60">Qual é a senha?</p>

      <div className="flex gap-2">
        <Input
          value={guessInput}
          maxLength={30}
          autoComplete="off"
          autoFocus
          disabled={isSubmittingGuess}
          placeholder="Digite seu palpite"
          onChange={(event) => {
            onGuessInputChange(event.target.value);
          }}
        />

        <Button
          type="submit"
          disabled={isSubmittingGuess || guessInput.trim().length === 0}
        >
          {isSubmittingGuess ? "Enviando..." : "Responder"}
        </Button>
      </div>

      {inputError && <p className="text-destructive text-sm">{inputError}</p>}
    </form>
  );
}

type ManualTurnControlsProps = {
  currentWord: string | null;
  isChangingWord: boolean;
  onSkipWord: () => void;
  onCorrectWord: () => void;
};

function ManualTurnControls({
  currentWord,
  isChangingWord,
  onSkipWord,
  onCorrectWord,
}: ManualTurnControlsProps) {
  return (
    <div className="mt-8 grid grid-cols-2 gap-4">
      <Button
        type="button"
        variant="outline"
        size="lg"
        disabled={isChangingWord || !currentWord}
        onClick={onSkipWord}
      >
        {isChangingWord ? "Pulando..." : "Pular"}
      </Button>

      <Button
        type="button"
        size="lg"
        disabled={isChangingWord || !currentWord}
        onClick={onCorrectWord}
      >
        Acertou
      </Button>
    </div>
  );
}
