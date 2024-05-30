import {
  Address,
  RpcApiMethods,
  createDefaultRpcTransport,
  createRpc,
  createRpcApi,
  mainnet,
} from "@solana/web3.js";

export type Cursor = string;

export type GetTokenAccountsResponse = Readonly<{
  total: number;
  limit: number;
  cursor: Cursor;
  token_accounts: {
    address: Address;
    mint: Address;
    owner: Address;
    amount: bigint;
    delegated_amount: bigint;
    frozen: boolean;
  }[];
}>;

interface HeliusDasApi extends RpcApiMethods {
  getTokenAccounts(params: {
    owner: Address;
    after?: Cursor;
    limit: number;
    options: {
      showZeroBalance: boolean;
    };
  }): GetTokenAccountsResponse;
}

export function createHeliusDasRpc(heliusApiKey: string) {
  const api = createRpcApi<HeliusDasApi>({
    // @ts-expect-error See https://github.com/solana-labs/solana-web3.js/pull/2751
    parametersTransformer: (params) => params[0],
  });
  const transport = createDefaultRpcTransport({
    url: mainnet(`https://mainnet.helius-rpc.com/?api-key=${heliusApiKey}`),
  });
  return createRpc({ api, transport });
}
