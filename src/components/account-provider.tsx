import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { accounts } from '../api/client';

// Get user's local timezone
function getLocalTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export interface FavoritePair {
  connector: string;
  pair: string;
}

interface AccountContextType {
  account: string;
  setAccount: (account: string) => void;
  accountsList: string[];
  isLoading: boolean;
  timezone: string;
  setTimezone: (tz: string) => void;
  favorites: FavoritePair[];
  addFavorite: (connector: string, pair: string) => void;
  removeFavorite: (connector: string, pair: string) => void;
  isFavorite: (connector: string, pair: string) => boolean;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

export function AccountProvider({ children }: { children: ReactNode }) {
  const [account, setAccountState] = useState<string>('');
  const [accountsList, setAccountsList] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timezone, setTimezoneState] = useState<string>(() => {
    const stored = localStorage.getItem('condor-timezone');
    return stored || getLocalTimezone();
  });
  const [favorites, setFavoritesState] = useState<FavoritePair[]>(() => {
    const stored = localStorage.getItem('condor-favorites');
    return stored ? JSON.parse(stored) : [];
  });

  useEffect(() => {
    async function fetchAccounts() {
      try {
        const list = await accounts.list();
        setAccountsList(list);
        // Restore from localStorage or use first account
        const stored = localStorage.getItem('condor-selected-account');
        if (stored && list.includes(stored)) {
          setAccountState(stored);
        } else if (list.length > 0) {
          setAccountState(list[0]);
        }
      } catch (err) {
        console.error('Failed to fetch accounts:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchAccounts();
  }, []);

  function setAccount(newAccount: string) {
    setAccountState(newAccount);
    localStorage.setItem('condor-selected-account', newAccount);
  }

  function setTimezone(tz: string) {
    setTimezoneState(tz);
    localStorage.setItem('condor-timezone', tz);
  }

  function addFavorite(connector: string, pair: string) {
    const newFavorites = [...favorites, { connector, pair }];
    setFavoritesState(newFavorites);
    localStorage.setItem('condor-favorites', JSON.stringify(newFavorites));
  }

  function removeFavorite(connector: string, pair: string) {
    const newFavorites = favorites.filter(f => !(f.connector === connector && f.pair === pair));
    setFavoritesState(newFavorites);
    localStorage.setItem('condor-favorites', JSON.stringify(newFavorites));
  }

  function isFavorite(connector: string, pair: string) {
    return favorites.some(f => f.connector === connector && f.pair === pair);
  }

  return (
    <AccountContext.Provider value={{ account, setAccount, accountsList, isLoading, timezone, setTimezone, favorites, addFavorite, removeFavorite, isFavorite }}>
      {children}
    </AccountContext.Provider>
  );
}

export function useAccount() {
  const context = useContext(AccountContext);
  if (context === undefined) {
    throw new Error('useAccount must be used within an AccountProvider');
  }
  return context;
}
