"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "@/app/providers/auth-provider";
import { getAccounts } from "@/shared/api";

type AccountsNavContextValue = {
  /** null — ещё не загрузили; false — счетов нет; true — есть хотя бы один */
  hasAccounts: boolean | null;
  refresh: () => void;
};

const AccountsNavContext = createContext<AccountsNavContextValue | null>(null);

export function AccountsNavProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [hasAccounts, setHasAccounts] = useState<boolean | null>(null);

  const refresh = useCallback(() => {
    if (!isAuthenticated) {
      setHasAccounts(null);
      return;
    }
    getAccounts()
      .then((list) => setHasAccounts(list.length > 0))
      .catch(() => setHasAccounts(true));
  }, [isAuthenticated]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ hasAccounts, refresh }),
    [hasAccounts, refresh],
  );

  return (
    <AccountsNavContext.Provider value={value}>
      {children}
    </AccountsNavContext.Provider>
  );
}

export function useAccountsNav(): AccountsNavContextValue {
  const ctx = useContext(AccountsNavContext);
  if (!ctx) {
    return { hasAccounts: true, refresh: () => {} };
  }
  return ctx;
}
