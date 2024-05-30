import { useWallet } from "@wallet-standard/react-core";
import { useWalletAccounts } from "../hooks/useWalletAccounts";
import { useWalletLocalStorage } from "../hooks/useWalletLocalStorage";
import { Container, SimpleGrid, Flex, Button, Text, TextInput, PasswordInput, Stack, Loader, Alert, List } from "@mantine/core";
import { ActionFunctionArgs, Form, useActionData } from "react-router-dom";
import AccountCheckboxes from "../components/AccountCheckboxes";
import { WalletMultiButton } from "../components/WalletMultiButton";
import { usePendingAddresses } from "../hooks/usePendingAddresses";
import { Address, isAddress } from "@solana/web3.js";
import { getSanctumExpQueryKey, getSanctumExp } from "../queries/getSanctumExp";
import { queryClient } from "../queries/queryClient";
import { getWonderlandHoldings, getWonderlandHoldingsKey } from "../queries/getWonderlandHoldings";
import { createHeliusDasRpc } from "../utils/helius";
import { IconExclamationCircle } from "@tabler/icons-react";
import { shortAddress } from "../components/AccountLabel";

type ActionResponse = {
    kind: 'error',
    error: string
} | {
    kind: 'success',
    data: {
        eligible: {
            address: Address,
            lsts: {
                name: string,
                symbol: string,
                amount: bigint,
                decimals: number,
            }[]
        }[],
        onWonderland: {
            address: Address,
            exp: bigint
        }[],
        ineligible: Address[]
    }
}

// Utility type to extract the data type from the success case
type ExtractData<T> = T extends { kind: 'success', data: infer D } ? D : never;
type SuccessData = ExtractData<ActionResponse>;

declare global {
    interface BigInt {
        toJSON(): string;
    }
}

BigInt.prototype.toJSON = function () {
    return this.toString();
};

export async function action({ request }: ActionFunctionArgs): Promise<ActionResponse> {
    const formData = await request.formData();
    const heliusApiKey = formData.get('heliusApiKey');
    if (!heliusApiKey) {
        return {
            kind: 'error',
            error: 'No Helius API key provided'
        }
    }
    const addresses = formData.getAll('addresses').map(a => a.toString()).filter(a => isAddress(a)) as Address[];
    if (addresses.length === 0) {
        return {
            kind: 'error',
            error: 'No accounts provided'
        }
    }

    const data: SuccessData = {
        eligible: [],
        onWonderland: [],
        ineligible: [],
    }

    const heliusRpc = createHeliusDasRpc(heliusApiKey.toString());

    for (const address of addresses) {
        const totalExp = await queryClient.fetchQuery({
            queryKey: getSanctumExpQueryKey(address),
            queryFn: () => getSanctumExp(address, request.signal)
        })

        if (totalExp) {
            // If there's already wonderland exp for the address, then it's already active
            data.onWonderland.push({
                address,
                exp: totalExp,
            })
        } else {
            // check for eligible LSTs
            const wonderlandHoldings = await queryClient.fetchQuery({
                queryKey: getWonderlandHoldingsKey(address),
                queryFn: () => getWonderlandHoldings(heliusRpc, address)
            })

            const filtered = wonderlandHoldings.filter(holding => {
                // Wonderland requires holding 0.1 of an LST
                const minimum = BigInt(10 ** (holding.decimals - 1));
                return holding.amount >= minimum;
            })


            if (filtered.length > 0) {
                // Account has Wonderland LSTs and is eligible to join
                data.eligible.push({
                    address,
                    lsts: filtered
                })
            } else {
                // Account has no eligible LST balances
                data.ineligible.push(address);
            }
        }
    }

    return {
        kind: 'success',
        data,
    }
}

function DisplayAccount({ address, label }: { address: Address, label: string | undefined }) {
    if (label) {
        return <Text component='span'>{label} (<Text component='span' c='gray.6'>{shortAddress(address)}</Text>)</Text>
    }

    return <Text component='span'>{shortAddress(address)}</Text>;
}

function ResultPanelInner() {
    const actionData = useActionData() as Awaited<ReturnType<typeof action>>;

    const { wallet } = useWallet();
    const { addressLabels } = useWalletAccounts(wallet);

    if (!actionData) return null;

    if (actionData.kind === 'error') {
        const icon = <IconExclamationCircle />;
        return (
            <Alert variant="light" color="red" title="Error" icon={icon}>
                {actionData.error}
            </Alert>
        );
    }

    const { data } = actionData;

    const formatter = new Intl.NumberFormat("en-GB");

    return (
        <Stack gap='md'>
            {data.eligible.map(account => (
                <div>
                    <Text size='md'><DisplayAccount address={account.address} label={addressLabels[account.address]} /> - {account.lsts.length} eligible LSTs</Text>
                    <List withPadding>
                        {account.lsts.map(lst => (
                            // @ts-expect-error formatter doesn't like this format
                            <List.Item>{formatter.format(`${lst.amount}E-${lst.decimals}`)} {lst.symbol}</List.Item>
                        ))}
                    </List>
                </div>
            ))}

            {data.onWonderland.length > 0 ?
                <div>
                    <Text size='md'>Already on Wonderland</Text>
                    <List withPadding>
                        {data.onWonderland.map(account => (
                            <List.Item><DisplayAccount address={account.address} label={addressLabels[account.address]} /> ({account.exp.toLocaleString()} exp)</List.Item>
                        ))}
                    </List>
                </div>
                : null
            }

            {data.ineligible.length > 0 ?
                <div>
                    <Text size='md'>No eligible LSTs</Text>
                    <List withPadding>
                        {data.ineligible.map(address => (
                            <List.Item><DisplayAccount address={address} label={addressLabels[address]} /></List.Item>
                        ))}
                    </List>
                </div>
                : null
            }

        </Stack>
    )
}

function ResultPanel() {
    const pendingAddresses = usePendingAddresses();


    return (
        <Stack gap='lg'>
            {pendingAddresses ? <Loader size='md' /> : null}

            <ResultPanelInner />
        </Stack>

    )
}

export default function Eligible() {
    const { isLoadingStoredWallet } = useWalletLocalStorage();

    const { wallet } = useWallet();
    const { accounts, addressLabels, hasLabels } = useWalletAccounts(wallet);

    const pendingAddresses = usePendingAddresses();

    if (isLoadingStoredWallet) return null;

    return (
        <Container size='lg' mt={32}>
            <SimpleGrid cols={{ base: 1, md: 2 }}>

                <Flex direction='column' gap='lg' align='flex-start'>
                    <WalletMultiButton />

                    <Form method="POST">

                        <Stack gap='xl'>
                            <PasswordInput
                                name='heliusApiKey'
                                label='Helius API Key'
                                required
                                description="Used only to fetch Wonderland LSTs owned by your accounts.
                                API calls are always made locally"
                                styles={{ wrapper: { maxWidth: 300 }, description: { whiteSpace: 'pre-wrap' } }}
                            />

                            <Flex direction='column' gap='lg' align='flex-start'>
                                {accounts.length > 0 ?
                                    <AccountCheckboxes accounts={accounts} /> :
                                    <Text>Connect a wallet to get started...</Text>
                                }

                                <Button type="submit" fit-content="true" disabled={pendingAddresses !== undefined || accounts.length === 0}>
                                    Fetch
                                </Button>
                            </Flex>
                        </Stack>
                    </Form>
                </Flex>

                <ResultPanel />
            </SimpleGrid>
        </Container>
    )
}