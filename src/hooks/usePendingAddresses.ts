import type { Address } from "@solana/web3.js";
import { useMemo } from "react";
import { useNavigation } from "react-router-dom";

export function usePendingAddresses() {
  const navigation = useNavigation();
  const pendingAddresses = useMemo(() => {
    const addresses = navigation.formData?.getAll("addresses");
    return addresses?.map((a) => a.toString() as Address);
  }, [navigation.formData]);

  return pendingAddresses;
}
