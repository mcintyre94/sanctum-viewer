import { Wallet } from "@wallet-standard/base";
import { useMemo } from "react";

export function useWalletAccounts(wallet: Wallet | null) {
  const accounts = useMemo(() => wallet?.accounts ?? [], [wallet?.accounts]);
  const addressLabels = useMemo(
    () => Object.fromEntries(accounts.map((a) => [a.address, a.label])),
    [accounts]
  );
  const hasLabels = useMemo(
    () =>
      Object.values(addressLabels).filter((l) => l !== undefined).length > 0,
    [addressLabels]
  );

  return {
    accounts,
    addressLabels,
    hasLabels,
  };
}
