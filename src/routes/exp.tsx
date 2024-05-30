import { useWallet } from "@wallet-standard/react-core";
import { useMemo } from "react";
import { useWalletLocalStorage } from "../hooks/useWalletLocalStorage";
import { WalletMultiButton } from "../components/WalletMultiButton";
import { Box, Button, Container, Flex, Loader, MantineColor, SimpleGrid, Stack, Table, TableData, Text } from "@mantine/core";
import { shortAddress } from "../components/AccountLabel";
import { ActionFunctionArgs, Form, useActionData } from "react-router-dom";
import { Address, isAddress } from "@solana/web3.js";
import { PieChart, PieChartCell } from "@mantine/charts";
import { queryClient } from '../queries/queryClient';
import AccountCheckboxes from "../components/AccountCheckboxes";
import { getSanctumExp, getSanctumExpQueryKey } from "../queries/getSanctumExp";
import { useWalletAccounts } from "../hooks/useWalletAccounts";
import { usePendingAddresses } from "../hooks/usePendingAddresses";

type AddressWithExp = {
    address: Address,
    exp: bigint | null
};

type ActionResponse = {
    kind: 'error',
    error: string
} | {
    kind: 'success',
    data: AddressWithExp[]
}

export async function action({ request }: ActionFunctionArgs): Promise<ActionResponse> {
    const formData = await request.formData();
    const addresses = formData.getAll('addresses').map(a => a.toString()).filter(a => isAddress(a)) as Address[];
    if (addresses.length === 0) {
        return {
            kind: 'error',
            error: 'No accounts provided'
        }
    }

    const data: AddressWithExp[] = []
    // one at a time to be polite
    for (const address of addresses) {
        const totalExp = await queryClient.fetchQuery({
            queryKey: getSanctumExpQueryKey(address),
            queryFn: () => getSanctumExp(address, request.signal)
        })
        data.push({ address, exp: totalExp })
    }

    data.sort((a, b) => Number((b.exp ?? 0n) - (a.exp ?? 0n)));

    return {
        kind: 'success',
        data,
    }
}

const colors: MantineColor[] = ["red.6", "blue.6", "yellow.6", "green.6", "grape.6", "pink.6", "cyan.6", "lime.6", "orange.6", "violet.6"]

type TableRow = {
    address: Address,
    exp: bigint | undefined | 'loading'
};

function makeTableRowData(
    fetchedData: AddressWithExp[],
    pendingAddresses: Address[] | undefined,
): TableRow[] {
    const isPending = pendingAddresses !== undefined;
    const pendingAddressesSet = new Set(pendingAddresses);
    const fetchedAddressesSet = new Set(fetchedData.map(({ address }) => address))

    // filter pending to remove already fetched, since the data won't change
    const filteredPendingAddresses = pendingAddresses?.filter((address) => !fetchedAddressesSet.has(address)) ?? [];

    // if pending, remove from fetched if it is not in the pending addresses
    // this means if the user unselected the checkbox, we immediately remove it
    const filteredFetchedData = isPending ?
        fetchedData.filter(({ address }) => pendingAddressesSet.has(address)) :
        fetchedData;

    const pendingRows: TableRow[] = (filteredPendingAddresses ?? []).map(address => ({
        address,
        exp: 'loading'
    }));

    return (filteredFetchedData as TableRow[]).concat(...pendingRows);
}

export default function Exp() {
    const { isLoadingStoredWallet } = useWalletLocalStorage();
    const actionData = useActionData() as Awaited<ReturnType<typeof action>>;

    const { wallet } = useWallet();
    const { accounts, addressLabels, hasLabels } = useWalletAccounts(wallet);

    const pendingAddresses = usePendingAddresses();

    const fetchedData = useMemo(() => {
        return actionData?.kind === 'success' ? actionData.data : []
    }, [actionData]);

    const tableRowData = useMemo(() => {
        return makeTableRowData(fetchedData, pendingAddresses)
    }, [fetchedData, pendingAddresses]);

    const tableData: TableData = {
        head: [
            "",
            hasLabels ? "Label" : "Address",
            "Total Exp"
        ],
        body: tableRowData.map(({ address, exp }, index) => [
            // Note: not using ColorSwatch because it doesn't work with theme colors
            exp === undefined || exp === 'loading' || colors[index] === undefined ? "" : <Box h={10} w={10} style={{ borderRadius: "var(--mantine-radius-md)" }} bg={colors[index]} />,
            addressLabels[address.toString()] ?? address,
            exp === 'loading' ? <Loader size='xs' /> : exp ? `${exp.toLocaleString()} Exp` : <Text c='gray.6'>-</Text>
        ])
    }

    const pieChartData: PieChartCell[] = useMemo(() => {
        return tableRowData
            .filter(({ exp }) => typeof exp === 'bigint')
            .slice(0, 10)
            .map(({ address, exp }, index) => ({
                name: addressLabels[address] ?? shortAddress(address),
                value: Number(exp),
                color: colors[index]
            }))
    }, [tableRowData, addressLabels]);

    if (isLoadingStoredWallet) return null;

    return (
        <Container size='lg' mt={32}>
            <SimpleGrid cols={{ base: 1, md: 2 }}>

                <Flex direction='column' gap='lg' align='flex-start'>
                    <WalletMultiButton />

                    <Form method="POST">

                        <Flex direction='column' gap='lg' align='flex-start'>
                            {accounts.length > 0 ?
                                <AccountCheckboxes accounts={accounts} /> :
                                <Text> Connect a wallet to get started...</Text>
                            }

                            <Button type="submit" fit-content="true" disabled={pendingAddresses !== undefined || accounts.length === 0}>
                                Fetch
                            </Button>
                        </Flex>
                    </Form>
                </Flex>

                <Stack>
                    <Table striped withRowBorders withTableBorder data={tableData} />

                    <Container mih={400} miw={400}>
                        {
                            pieChartData.length > 0 ?
                                <PieChart
                                    size={300}
                                    data={pieChartData}
                                    withTooltip
                                    tooltipProps={{ wrapperStyle: { background: 'white', color: 'darkblue', padding: 4 } }}
                                    tooltipDataSource='segment'
                                    valueFormatter={n => `${n.toLocaleString()} exp`}
                                    style={{ width: '100%', height: '100%' }}
                                /> : null
                        }
                    </Container>
                </Stack>
            </SimpleGrid>
        </Container>
    )
}
