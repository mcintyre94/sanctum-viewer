import { Address } from "@solana/web3.js";
import { QueryKey } from "@tanstack/react-query";

export function getSanctumExpQueryKey(address: Address): QueryKey {
  return ["exp", address];
}

type SanctumApiResponse = {
  totalExp: number;
};

export async function getSanctumExp(
  address: Address,
  abortSignal: AbortSignal
): Promise<bigint | null> {
  const sanctumApiUrl = `https://wonderland-api2.ngrok.dev/s1/user/full?pk=${address}`;
  const response = await fetch(sanctumApiUrl, { signal: abortSignal });

  if (response.status === 404) {
    // no Wonderland for this address
    return null;
  }

  if (response.status !== 200) {
    throw new Error(
      `Sanctum API error. Status: ${response.status} ${response.statusText}`
    );
  }

  const responseJson = await response.json();
  if (responseJson === null) {
    throw new Error(`Sanctum API error. Did not return body.`);
  }

  return BigInt((responseJson as SanctumApiResponse).totalExp);
}
