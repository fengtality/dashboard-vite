import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { accounts } from '../api/client';

interface AccountContextType {
  account: string;
  setAccount: (account: string) => void;
  accountsList: string[];
  isLoading: boolean;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

export function AccountProvider({ children }: { children: ReactNode }) {
  const [account, setAccountState] = useState<string>('');
  const [accountsList, setAccountsList] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchAccounts() {
      try {
        const list = await accounts.list();
        setAccountsList(list);
        // Restore from localStorage or use first account
        const stored = localStorage.getItem('hummingbot-selected-account');
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
    localStorage.setItem('hummingbot-selected-account', newAccount);
  }

  return (
    <AccountContext.Provider value={{ account, setAccount, accountsList, isLoading }}>
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
