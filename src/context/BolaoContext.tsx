import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Bolao, Bet, BetAmount, Game } from '../types';

interface CreateBolaoParams {
  title: string;
  game: Game;
  betAmount: BetAmount;
  maxParticipants: number;
  hasPassword: boolean;
  password?: string;
  creatorId: string;
  creatorName: string;
}

interface BolaoContextData {
  boloes: Bolao[];
  createBolao: (params: CreateBolaoParams) => Bolao;
  getBolaoByCode: (code: string) => Bolao | undefined;
  getBolaoById: (id: string) => Bolao | undefined;
  joinBolao: (bolaoId: string, password?: string, userId?: string, userName?: string) => boolean;
  makeBet: (bolaoId: string, userId: string, userName: string, homeScore: number, awayScore: number) => void;
  confirmPayment: (bolaoId: string, userId: string) => void;
  getUserBoloes: (userId: string) => Bolao[];
}

const BolaoContext = createContext<BolaoContextData>({} as BolaoContextData);

function generateCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function BolaoProvider({ children }: { children: ReactNode }) {
  const [boloes, setBoloes] = useState<Bolao[]>([]);

  const createBolao = (params: CreateBolaoParams): Bolao => {
    const newBolao: Bolao = {
      id: String(Date.now()),
      title: params.title,
      game: params.game,
      creatorId: params.creatorId,
      creatorName: params.creatorName,
      betAmount: params.betAmount,
      maxParticipants: params.maxParticipants,
      participants: [],
      hasPassword: params.hasPassword,
      password: params.password,
      status: 'open',
      prizePool: 0,
      inviteCode: generateCode(),
      createdAt: new Date().toISOString(),
    };
    setBoloes(prev => [newBolao, ...prev]);
    return newBolao;
  };

  const getBolaoByCode = (code: string) =>
    boloes.find(b => b.inviteCode === code.toUpperCase());

  const getBolaoById = (id: string) =>
    boloes.find(b => b.id === id);

  const joinBolao = (bolaoId: string, password?: string, userId?: string, userName?: string): boolean => {
    const bolao = boloes.find(b => b.id === bolaoId);
    if (!bolao) return false;
    if (bolao.participants.length >= bolao.maxParticipants) return false;
    if (bolao.hasPassword && bolao.password !== password) return false;
    if (bolao.participants.find(p => p.userId === userId)) return true;

    const participant: Bet = {
      userId: userId || 'guest',
      userName: userName || 'Convidado',
      homeScore: 0,
      awayScore: 0,
      hasPaid: false,
      joinedAt: new Date().toISOString(),
    };

    setBoloes(prev =>
      prev.map(b =>
        b.id === bolaoId
          ? { ...b, participants: [...b.participants, participant] }
          : b
      )
    );
    return true;
  };

  const makeBet = (
    bolaoId: string,
    userId: string,
    userName: string,
    homeScore: number,
    awayScore: number
  ) => {
    setBoloes(prev =>
      prev.map(b => {
        if (b.id !== bolaoId) return b;
        const updated = b.participants.map(p =>
          p.userId === userId ? { ...p, homeScore, awayScore } : p
        );
        const hasPart = updated.find(p => p.userId === userId);
        if (!hasPart) {
          updated.push({
            userId,
            userName,
            homeScore,
            awayScore,
            hasPaid: false,
            joinedAt: new Date().toISOString(),
          });
        }
        return { ...b, participants: updated };
      })
    );
  };

  const confirmPayment = (bolaoId: string, userId: string) => {
    setBoloes(prev =>
      prev.map(b => {
        if (b.id !== bolaoId) return b;
        const updated = b.participants.map(p =>
          p.userId === userId ? { ...p, hasPaid: true } : p
        );
        const paidCount = updated.filter(p => p.hasPaid).length;
        return {
          ...b,
          participants: updated,
          prizePool: paidCount * b.betAmount,
        };
      })
    );
  };

  const getUserBoloes = (userId: string) =>
    boloes.filter(
      b => b.creatorId === userId || b.participants.find(p => p.userId === userId)
    );

  return (
    <BolaoContext.Provider
      value={{
        boloes,
        createBolao,
        getBolaoByCode,
        getBolaoById,
        joinBolao,
        makeBet,
        confirmPayment,
        getUserBoloes,
      }}
    >
      {children}
    </BolaoContext.Provider>
  );
}

export const useBolao = () => useContext(BolaoContext);
