import type { Face } from "../Face";
import type { Credit, GameState, Team } from "../Game";
import type { Seats } from "./Room";

export type Action =
  | { type: "clue"; word: string; count: number }
  | { type: "guess"; cardIndex: number }
  | { type: "toggleMark"; cardIndex: number; team: Team }
  | { type: "endTurn" }
  | {
      type: "newGame";
      faces?: Face[];
      credit?: Credit | null;
      deck?: string | null;
      rotate?: boolean;
    };

export type Presence = { __presence: true; spymasterTeam: Team | null };
export type TeamClaim = { __team: true; team: Team };
export type Ping = { __ping: true };

export interface Player {
  id: string;
  team: Team;
  emoji: string;
}

export interface RoomView {
  state: GameState;
  seats: Seats;
  players: Player[];
}

export class Roster {
  constructor(
    readonly players: readonly Player[],
    private readonly seats: Seats = { red: null, blue: null },
  ) {}

  stillGathering(): boolean {
    return this.players.length < 4;
  }

  operativesOf(team: Team): Player[] {
    return this.players.filter(
      (player) => player.team === team && player.id !== this.seats.red && player.id !== this.seats.blue,
    );
  }

  ofTeam(team: Team): Player[] {
    return this.players.filter((player) => player.team === team);
  }

  spymasterOf(team: Team): string | null {
    return this.seats[team];
  }

  seatOf(playerId: string): Team | null {
    return this.seats.red === playerId ? "red" : this.seats.blue === playerId ? "blue" : null;
  }

  teamOf(playerId: string): Team | null {
    return this.players.find((player) => player.id === playerId)?.team ?? null;
  }
}

export interface Session {
  roomCode: string;
  selfId: string;
  dispatch: (action: Action) => void;
  setSpymaster: (team: Team | null) => void;
  setTeam: (team: Team) => void;
  subscribe: (listener: (view: RoomView) => void) => void;
  onDisconnect: (listener: () => void) => void;
  close: () => void;
}
