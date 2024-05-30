import { Address, Rpc } from "@solana/web3.js";
import { QueryKey } from "@tanstack/react-query";
import {
  Cursor,
  GetTokenAccountsResponse,
  createHeliusDasRpc,
} from "../utils/helius";

export function getWonderlandHoldingsKey(address: Address): QueryKey {
  return ["wonderland-holdings", address];
}

const wonderlandMintData: {
  [address: Address]: { name: string; symbol: string };
} = {
  ["5oVNBeEEQvYi1cX3ir8Dx5n1P7pdxydbGF2X4TxVusJm" as Address]: {
    name: "Infinity",
    symbol: "INF",
  },
  ["BonK1YhkXEGLZzwtcvRTip3gAL9nCeQD7ppZBLXhtTs" as Address]: {
    name: "bonkSOL",
    symbol: "bonkSOL",
  },
  ["Comp4ssDzXcLeu2MnLuGNNFC4cmLPMng8qWHPvzAMU1h" as Address]: {
    name: "Solana Compass Staked SOL",
    symbol: "COMPASSSOL",
  },
  ["Dso1bDeDjCQxTrWHqUUi63oBvV7Mdm6WaobLbQ7gnPQ" as Address]: {
    name: "Drift Staked SOL",
    symbol: "DSOL",
  },
  ["GRJQtWwdJmp5LLpy8JWjPgn5FnLyqSJGNhn5ZnCTFUwM" as Address]: {
    name: "Overclock Staked SOL",
    symbol: "CLOCKSOL",
  },
  ["HUBsveNpjo5pWqNkH57QzxjQASdTVXcSK7bVKTSZtcSX" as Address]: {
    name: "SolanaHub staked SOL",
    symbol: "HUBSOL",
  },
  ["LAinEtNLgpmCP9Rvsf5Hn8W6EhNiKLZQti1xfWMLy6X" as Address]: {
    name: "Laine Staked SOL",
    symbol: "LAINESOL",
  },
  ["LnTRntk2kTfWEY6cVB8K9649pgJbt6dJLS1Ns1GZCWg" as Address]: {
    name: "Lantern Staked SOL",
    symbol: "LANTERNSOL",
  },
  ["he1iusmfkpAdwvxLNGV8Y1iSbj4rUy6yMhEA3fotn9A" as Address]: {
    name: "Helius Staked SOL",
    symbol: "HSOL",
  },
  ["jucy5XJ76pHVvtPZb5TKRcGQExkwit2P5s4vY8UzmpC" as Address]: {
    name: "Juicy Stake Staked SOL",
    symbol: "jucySOL",
  },
  ["jupSoLaHXQiZZTSfEWMTRRgpnyFm8f6sZdosWBjx93v" as Address]: {
    name: "Jupiter Staked SOL",
    symbol: "JUPSOL",
  },
  ["pWrSoLAhue6jUxUkbWgmEy5rD9VJzkFmvfTDV5KgNuu" as Address]: {
    name: "Power Staked SOL",
    symbol: "PWRSOL",
  },
  ["pathdXw4He1Xk3eX84pDdDZnGKEme3GivBamGCVPZ5a" as Address]: {
    name: "Pathfinders Staked SOL",
    symbol: "PATHSOL",
  },
  ["picobAEvs6w7QEknPce34wAE4gknZA9v5tTonnmHYdX" as Address]: {
    name: "Pico Staked SOL",
    symbol: "PICOSOL",
  },
  ["st8QujHLPsX3d6HG9uQg9kJ91jFxUgruwsb1hyYXSNd" as Address]: {
    name: "Stake City Staked SOL",
    symbol: "STAKESOL",
  },
  ["strng7mqqc1MBJJV6vMzYbEqnwVGvKKGKedeCvtktWA" as Address]: {
    name: "Stronghold Staked SOL",
    symbol: "STRONGSOL",
  },
  ["suPer8CPwxoJPQ7zksGMwFvjBQhjAHwUMmPV4FVatBw" as Address]: {
    name: "Superfast Staked SOL",
    symbol: "SUPERSOL",
  },
  ["vSoLxydx6akxyMD9XEcPvGYNGq6Nn66oqVb3UkGkei7" as Address]: {
    name: "The Vault Staked SOL",
    symbol: "VSOL",
  },
};

type HeliusTokenAccounts = GetTokenAccountsResponse["token_accounts"];

async function getTokensForAddressRecursive(
  rpc: ReturnType<typeof createHeliusDasRpc>,
  address: Address,
  after: Cursor | undefined = undefined,
  tokenAccountsSoFar: HeliusTokenAccounts = []
): Promise<HeliusTokenAccounts> {
  const response = await rpc
    .getTokenAccounts({
      owner: address,
      limit: 1000,
      options: { showZeroBalance: false },
      after,
    })
    .send();
  const allTokenAccountsSoFar = tokenAccountsSoFar.concat(
    response.token_accounts
  );

  if (response.total === response.limit) {
    // more token accounts to fetch
    return getTokensForAddressRecursive(
      rpc,
      address,
      response.cursor,
      allTokenAccountsSoFar
    );
  }

  // no more to fetch, return all
  return allTokenAccountsSoFar;
}

export async function getWonderlandHoldings(
  rpc: ReturnType<typeof createHeliusDasRpc>,
  address: Address
) {
  const tokenAccounts = await getTokensForAddressRecursive(rpc, address);

  return tokenAccounts.flatMap((tokenAccount) => {
    const tokenMetadata = wonderlandMintData[tokenAccount.mint];
    if (!tokenMetadata) return [];

    return [
      {
        name: tokenMetadata.name,
        symbol: tokenMetadata.symbol,
        decimals: 9, // all wonderland LSTs have 9 decimals currently
        amount: tokenAccount.amount,
      },
    ];
  });
}
