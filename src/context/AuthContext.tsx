import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User } from '../types';

interface AuthContextData {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (name: string, email: string, phone: string, pixKey: string, password: string) => Promise<boolean>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

const MOCK_USERS: (User & { password: string })[] = [
  {
    id: '1',
    name: 'João Silva',
    email: 'joao@email.com',
    phone: '11999999999',
    pixKey: 'joao@email.com',
    password: '123456',
  },
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const signIn = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 800));
    const found = MOCK_USERS.find(u => u.email === email && u.password === password);
    if (found) {
      const { password: _, ...userData } = found;
      setUser(userData);
      setIsLoading(false);
      return true;
    }
    setIsLoading(false);
    return false;
  };

  const signUp = async (
    name: string,
    email: string,
    phone: string,
    pixKey: string,
    password: string
  ): Promise<boolean> => {
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 800));
    const newUser: User = {
      id: String(Date.now()),
      name,
      email,
      phone,
      pixKey,
    };
    MOCK_USERS.push({ ...newUser, password });
    setUser(newUser);
    setIsLoading(false);
    return true;
  };

  const signOut = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
