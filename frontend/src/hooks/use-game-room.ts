"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { socket } from "@/lib/socket";
import type {
  ChangeWordResponse,
  Game,
  GameWordPayload,
  ReconnectGameResponse,
  RematchResponse,
  StartTurnResponse,
  SubmitClueResponse,
  SubmitGuessResponse,
} from "@/types/game";
import type { Player, Room } from "@/types/room";

type UseGameRoomResult = {
  room: Room | null;
  game: Game | null;
  playerId: string | null;
  currentPlayer: Player | undefined;

  activeTeamPlayers: Player[];
  clueGiver: Player | undefined;
  guesser: Player | undefined;

  hasLoaded: boolean;
  timeLeft: number;
  currentWord: string | null;

  isActiveTeam: boolean;
  isClueGiver: boolean;
  isGuesser: boolean;
  canSeeWord: boolean;
  isOwner: boolean;

  clueInput: string;
  guessInput: string;
  inputError: string | null;

  isStartingTurn: boolean;
  isChangingWord: boolean;
  isSubmittingClue: boolean;
  isSubmittingGuess: boolean;
  isReturningToLobby: boolean;

  changeClueInput: (value: string) => void;
  changeGuessInput: (value: string) => void;
  clearInputError: () => void;

  startTurn: () => void;
  skipWord: () => void;
  correctWord: () => void;
  submitClue: () => void;
  submitGuess: () => void;
  requestRematch: () => void;
};

export function useGameRoom(roomId: string): UseGameRoomResult {
  const router = useRouter();

  const [room, setRoom] = useState<Room | null>(null);
  const [game, setGame] = useState<Game | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);

  const [hasLoaded, setHasLoaded] = useState(false);

  const [timeLeft, setTimeLeft] = useState(0);
  const [serverTimeOffset, setServerTimeOffset] = useState(0);
  const [currentWord, setCurrentWord] = useState<string | null>(null);

  const [clueInput, setClueInput] = useState("");
  const [guessInput, setGuessInput] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);

  const [isStartingTurn, setIsStartingTurn] = useState(false);

  const [isChangingWord, setIsChangingWord] = useState(false);

  const [isSubmittingClue, setIsSubmittingClue] = useState(false);

  const [isSubmittingGuess, setIsSubmittingGuess] = useState(false);

  const [isReturningToLobby, setIsReturningToLobby] = useState(false);

  const saveRoom = useCallback((updatedRoom: Room) => {
    setRoom(updatedRoom);

    localStorage.setItem(
      `room:${updatedRoom.id}:state`,
      JSON.stringify(updatedRoom),
    );
  }, []);

  const saveGame = useCallback((updatedGame: Game) => {
    setGame(updatedGame);

    localStorage.setItem(
      `room:${updatedGame.roomId}:game`,
      JSON.stringify(updatedGame),
    );
  }, []);

  const clearStoredGameSession = useCallback(() => {
    localStorage.removeItem(`room:${roomId}:state`);

    localStorage.removeItem(`room:${roomId}:game`);

    localStorage.removeItem(`room:${roomId}:playerId`);
  }, [roomId]);

  const resetTurnInputs = useCallback(() => {
    setClueInput("");
    setGuessInput("");
    setInputError(null);
    setIsSubmittingClue(false);
    setIsSubmittingGuess(false);
  }, []);

  useEffect(() => {
    const storedPlayerId = localStorage.getItem(`room:${roomId}:playerId`);

    if (!storedPlayerId) {
      router.replace(`/room/${roomId}`);
      return;
    }

    function handleTurnStarted(updatedGame: Game) {
      saveGame(updatedGame);

      setCurrentWord(null);
      setIsStartingTurn(false);
      setIsChangingWord(false);

      resetTurnInputs();
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

      resetTurnInputs();
    }

    function handleGameUpdated(updatedGame: Game) {
      saveGame(updatedGame);
    }

    function handleReturnedToLobby(updatedRoom: Room) {
      saveRoom(updatedRoom);

      localStorage.removeItem(`room:${updatedRoom.id}:game`);

      router.replace(`/room/${updatedRoom.id}`);
    }

    function handleRoomUpdated(updatedRoom: Room) {
      saveRoom(updatedRoom);
    }

    function reconnectGame() {
      const pingStartTime = Date.now();
      socket.emit("game:ping", (response: { success: true; data: { timestamp: number } }) => {
        const pingEndTime = Date.now();
        const latency = pingEndTime - pingStartTime;
        const serverTimestamp = response.data.timestamp;
        
        const offset = (serverTimestamp - pingEndTime) + (latency / 2);
        setServerTimeOffset(offset);
      });

      socket.emit(
        "game:reconnect",
        {
          roomId,
          playerId: storedPlayerId,
        },
        (response: ReconnectGameResponse) => {
          if (!response.success) {
            clearStoredGameSession();
            router.replace(`/room/${roomId}`);
            return;
          }

          const {
            room: updatedRoom,
            game: updatedGame,
            playerId: reconnectedPlayerId,
            word,
          } = response.data;

          saveRoom(updatedRoom);
          saveGame(updatedGame);

          setPlayerId(reconnectedPlayerId);
          setCurrentWord(word);
          setHasLoaded(true);

          localStorage.setItem(
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

    socket.on("room:updated", handleRoomUpdated);

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

      socket.off("room:updated", handleRoomUpdated);

      socket.off("room:returned-to-lobby", handleReturnedToLobby);

      socket.off("connect", reconnectGame);
    };
  }, [
    clearStoredGameSession,
    resetTurnInputs,
    roomId,
    router,
    saveGame,
    saveRoom,
  ]);

  useEffect(() => {
    if (game?.phase !== "playing" || !game.turnEndsAt) {
      setTimeLeft(0);
      return;
    }

    function updateTimer() {
      const endsAt = new Date(game?.turnEndsAt as string).getTime();
      const adjustedNow = Date.now() + serverTimeOffset;

      const remainingMilliseconds = endsAt - adjustedNow;

      const remainingSeconds = Math.max(
        0,
        Math.ceil(remainingMilliseconds / 1_000),
      );

      setTimeLeft(remainingSeconds);
    }

    updateTimer();

    const interval = window.setInterval(updateTimer, 250);

    return () => {
      window.clearInterval(interval);
    };
  }, [game?.phase, game?.turnEndsAt]);

  useEffect(() => {
    setInputError(null);

    if (game?.turnInputPhase === "waiting_clue") {
      setGuessInput("");
      setIsSubmittingGuess(false);
    }

    if (game?.turnInputPhase === "waiting_guess") {
      setClueInput("");
      setIsSubmittingClue(false);
    }
  }, [game?.turnInputPhase]);

  const currentPlayer = useMemo(
    () => room?.players.find((player) => player.id === playerId),
    [playerId, room],
  );

  const activeRoles = useMemo(() => {
    if (!game) {
      return null;
    }

    return game.activeTeam === "team1" ? game.roles.team1 : game.roles.team2;
  }, [game]);

  const activeTeamPlayers = useMemo(() => {
    if (!room || !game) {
      return [];
    }

    return room.players.filter((player) => player.team === game.activeTeam);
  }, [game, room]);

  const clueGiver = useMemo(() => {
    if (!room || !activeRoles) {
      return undefined;
    }

    return room.players.find((player) => player.id === activeRoles.clueGiverId);
  }, [activeRoles, room]);

  const guesser = useMemo(() => {
    if (!room || !activeRoles) {
      return undefined;
    }

    return room.players.find((player) => player.id === activeRoles.guesserId);
  }, [activeRoles, room]);

  const isActiveTeam =
    currentPlayer !== undefined &&
    game !== null &&
    currentPlayer.team === game.activeTeam;

  const isClueGiver =
    currentPlayer !== undefined &&
    activeRoles !== null &&
    currentPlayer.id === activeRoles.clueGiverId;

  const isGuesser =
    currentPlayer !== undefined &&
    activeRoles !== null &&
    currentPlayer.id === activeRoles.guesserId;

  const canSeeWord =
    isClueGiver ||
    (currentPlayer?.team !== null &&
      currentPlayer?.team !== undefined &&
      game !== null &&
      currentPlayer.team !== game.activeTeam);

  const isOwner = currentPlayer?.isOwner === true;

  const validateSingleWord = useCallback((value: string): string | null => {
    const normalizedValue = value.trim();

    if (!normalizedValue) {
      return "Digite uma palavra.";
    }

    if (normalizedValue.split(/\s+/).length !== 1) {
      return "Digite apenas uma palavra.";
    }

    if (normalizedValue.length > 30) {
      return "A palavra deve ter no máximo 30 caracteres.";
    }

    return null;
  }, []);

  const changeClueInput = useCallback((value: string) => {
    setClueInput(value);
    setInputError(null);
  }, []);

  const changeGuessInput = useCallback((value: string) => {
    setGuessInput(value);
    setInputError(null);
  }, []);

  const clearInputError = useCallback(() => {
    setInputError(null);
  }, []);

  const startTurn = useCallback(() => {
    if (
      !socket.connected ||
      isStartingTurn ||
      game?.phase !== "waiting_turn" ||
      !isClueGiver
    ) {
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

        saveGame(response.data.game);
      },
    );
  }, [game?.phase, isClueGiver, isStartingTurn, roomId, saveGame]);

  const changeWord = useCallback(
    (event: "game:correct-word" | "game:skip-word") => {
      if (
        !socket.connected ||
        isChangingWord ||
        game?.phase !== "playing" ||
        !isClueGiver
      ) {
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

          saveGame(response.data.game);
        },
      );
    },
    [game?.phase, isChangingWord, isClueGiver, roomId, saveGame],
  );

  const skipWord = useCallback(() => {
    changeWord("game:skip-word");
  }, [changeWord]);

  const correctWord = useCallback(() => {
    if (game?.inputModeEnabled) {
      return;
    }

    changeWord("game:correct-word");
  }, [changeWord, game?.inputModeEnabled]);

  const submitClue = useCallback(() => {
    if (
      !socket.connected ||
      !game?.inputModeEnabled ||
      game.phase !== "playing" ||
      game.turnInputPhase !== "waiting_clue" ||
      !isClueGiver ||
      isSubmittingClue
    ) {
      return;
    }

    const normalizedClue = clueInput.trim();

    const validationError = validateSingleWord(normalizedClue);

    if (validationError) {
      setInputError(validationError);
      return;
    }

    setInputError(null);
    setIsSubmittingClue(true);

    socket.emit(
      "game:submit-clue",
      {
        roomId,
        clue: normalizedClue,
      },
      (response: SubmitClueResponse) => {
        setIsSubmittingClue(false);

        if (!response.success) {
          setInputError(response.message);
          return;
        }

        setClueInput("");
        saveGame(response.data.game);
      },
    );
  }, [
    clueInput,
    game,
    isClueGiver,
    isSubmittingClue,
    roomId,
    saveGame,
    validateSingleWord,
  ]);

  const submitGuess = useCallback(() => {
    if (
      !socket.connected ||
      !game?.inputModeEnabled ||
      game.phase !== "playing" ||
      game.turnInputPhase !== "waiting_guess" ||
      !isGuesser ||
      isSubmittingGuess
    ) {
      return;
    }

    const normalizedGuess = guessInput.trim();

    const validationError = validateSingleWord(normalizedGuess);

    if (validationError) {
      setInputError(validationError);
      return;
    }

    setInputError(null);
    setIsSubmittingGuess(true);

    socket.emit(
      "game:submit-guess",
      {
        roomId,
        guess: normalizedGuess,
      },
      (response: SubmitGuessResponse) => {
        setIsSubmittingGuess(false);

        if (!response.success) {
          setInputError(response.message);
          return;
        }

        setGuessInput("");
        saveGame(response.data.game);
      },
    );
  }, [
    game,
    guessInput,
    isGuesser,
    isSubmittingGuess,
    roomId,
    saveGame,
    validateSingleWord,
  ]);

  const requestRematch = useCallback(() => {
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
  }, [game?.phase, isOwner, isReturningToLobby, roomId]);

  return {
    room,
    game,
    playerId,
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
    clearInputError,

    startTurn,
    skipWord,
    correctWord,
    submitClue,
    submitGuess,
    requestRematch,
  };
}
