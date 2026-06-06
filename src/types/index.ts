export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  pixKey: string;
  avatar?: string;
}

export interface Team {
  name: string;
  code: string;
  flag: string;
}

export interface Game {
  id: string;
  homeTeam: Team;
  awayTeam: Team;
  date: string;
  time: string;
  stage: string;
  group?: string;
  venue: string;
  status: 'upcoming' | 'live' | 'finished';
  homeScore?: number;
  awayScore?: number;
}

export interface Bet {
  userId: string;
  userName: string;
  homeScore: number;
  awayScore: number;
  hasPaid: boolean;
  isWinner?: boolean;
  joinedAt: string;
}

export interface Bolao {
  id: string;
  title: string;
  game: Game;
  creatorId: string;
  creatorName: string;
  betAmount: BetAmount;
  maxParticipants: number;
  participants: Bet[];
  hasPassword: boolean;
  password?: string;
  status: 'open' | 'closed' | 'finished';
  prizePool: number;
  inviteCode: string;
  createdAt: string;
}

export type BetAmount = 20 | 50 | 100 | 200 | 500 | 1000;

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Main: undefined;
  CreateBolao: undefined;
  BolaoDetail: { bolaoId: string };
  JoinBolao: { code: string };
  MakeBet: { bolaoId: string };
  PixPayment: { bolaoId: string; amount: number };
};
