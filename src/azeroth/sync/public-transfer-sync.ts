import {
    TransactionMetaList,
    Web3Extended,
    Web3Erc20,
    Web3Erc721,
    Web3Erc1155,
} from '../../web3';
import { LocalStore, Network, NetworkEndPointModel } from '../../local-storage';
import { findToken } from '../../common/network';
import { web3NumbersToBigInt, web3NumbersToNumber } from '../../common/utilities';
import {
    ERCTokenPublicTransfer,
    ERCTokenPublicTransferList,
    ErcTransferEventLog,
    NativePublicTransferList,
    Token,
    TokenType,
    TransactionMeta
} from '../../web3/types';
import { AddZkTransferParamMap } from '../../local-storage/types'; 

export async function syncPublicTransfers(
    localStore: LocalStore,
    network: Network,
    fromBlock: number,
    toBlock: number,
    web3Ext?: Web3Extended | undefined,
): Promise<void> {

    const networkUid = network.networkId.toString();
    const networkAvgBlkTime = network.averageBlockTime;
    const endPointList = network.endPointList.map(e => e);
    const walletList = localStore.getWallets(false).map(w => w.address);

    const web3Extended = web3Ext !== undefined
        ? web3Ext
        : new Web3Extended({ networkUid, networkAvgBlkTime, endPointList });

    syncNativePublicTransfers(
        localStore,
        network,
        fromBlock,
        toBlock,
        web3Extended,
        walletList,
        networkUid,
        networkAvgBlkTime,
        endPointList
    );

    syncERCPublicTransfers(
        localStore,
        network,
        fromBlock,
        toBlock,
        web3Extended,
        walletList,
        networkUid,
        networkAvgBlkTime,
        endPointList
    );
}

async function syncNativePublicTransfers(
    localStore: LocalStore,
    network: Network,
    fromBlock: number,
    toBlock: number,
    web3Extended: Web3Extended,
    walletList: string[],
    networkUid: string,
    networkAvgBlkTime:number,
    endPointList: NetworkEndPointModel[],
): Promise<void> {

    web3Extended.getIndexerNativeTransferList(
        walletList,
        { from: fromBlock, to: toBlock }
    ).then(async (transferList) => {

        if (transferList.length === 0) { return; }

        // remove duplicate tx hash
        const uniqueTxHashes = new Set<string>();
        const filteredTxHashes: NativePublicTransferList = [];
        transferList.forEach(tx => {
            if (uniqueTxHashes.has(tx.transactionHash) === false) {
                uniqueTxHashes.add(tx.transactionHash);
                filteredTxHashes.push(tx);
            }
        });

        //  filter out : 
        //      - remove invalid addresses
        //      - transfer to zkWallet contract
        //      - all other contract calls
        const filtered: NativePublicTransferList = [];
        for (const tx of filteredTxHashes) {
            
            const filterOut =
                tx.to === network.azerothContractAddress ||
                tx.from === network.azerothContractAddress ||
                Web3Extended.utils.isValidAddress(tx.to) === false ||
                Web3Extended.utils.isValidAddress(tx.from) === false ||
                (await web3Extended.isEoaAddress(tx.to)) === false ||
                (await web3Extended.isEoaAddress(tx.from)) === false ||
                BigInt(tx.from) === 0n ||
                BigInt(tx.to) === 0n;
            
            if (!filterOut) filtered.push(tx);
        }

        web3Extended
            .getTransactionList(filtered)
            .then(txList => addNativeListToLocalStore(txList, localStore, network, walletList, web3Extended));

    }).catch(e => {
        console.error('Error fetching native transfer list:', e);
    });
}

async function syncERCPublicTransfers(
    localStore: LocalStore,
    network: Network,
    fromBlock: number,
    toBlock: number,
    web3Extended: Web3Extended,
    walletList: string[],
    networkUid: string,
    networkAvgBlkTime:number,
    endPointList: NetworkEndPointModel[],
): Promise<void> {

    web3Extended.getIndexerERCTokenTransferList(
        walletList,
        { from: fromBlock, to: toBlock }
    ).then(async (transferList) => {

        if (transferList.length === 0) { return; }

        // remove duplicate tx hash
        const uniqueTxHashes = new Set<string>();
        const filteredTxHashes : ERCTokenPublicTransferList = [];
        transferList.forEach(tx => {
            if (uniqueTxHashes.has(tx.transactionHash) === false) {
                uniqueTxHashes.add(tx.transactionHash);
                filteredTxHashes.push(tx);
            }
        });

        //  filter out : 
        //      - remove invalid addresses
        //      - transfer to zkWallet contract
        //      - erc tokens not in local DB, or masked
        //      - erc mint
        const filtered: ERCTokenPublicTransferList = [];
        
        const localContractAddressList = new Set(
            localStore.getTokenContracts(network.uid.toString())
                .map(contract => contract.contractAddress.toLowerCase())
        );

        for (const tx of filteredTxHashes) {
            
            const filterOut =
                tx.to === network.azerothContractAddress ||
                tx.from === network.azerothContractAddress ||
                Web3Extended.utils.isValidAddress(tx.contractAddress) === false ||
                Web3Extended.utils.isValidAddress(tx.to) === false ||
                Web3Extended.utils.isValidAddress(tx.from) === false ||
                localContractAddressList.has(tx.contractAddress.toLowerCase()) === false ||
                (await web3Extended.isEoaAddress(tx.to)) === false ||
                (await web3Extended.isEoaAddress(tx.from)) === false ||
                BigInt(tx.from) === 0n ||
                BigInt(tx.to) === 0n;
            
            if (!filterOut) filtered.push(tx);
        }

        const tokenMap = new Map<string, Token>();
        const filteredWithTokens: { tx: ERCTokenPublicTransfer, token: Token }[] = [];
        let transferEvents: ErcTransferEventLog[] = [];

        for (const tx of filtered) {
            const token = await findToken({
                localStore,
                network,
                contractAddress: tx.contractAddress,
                addToLocalStoreIfNotExist: false,
            }) as Token;
            tokenMap.set(tx.contractAddress, token);
            filteredWithTokens.push({ tx, token });
        }
 
        // fetch erc transfer event
        for (const filteredWithToken of filteredWithTokens) {
            const { tx, token } = filteredWithToken;
            const ercWeb3 = token.tokenType === TokenType.ERC_20
                ? new Web3Erc20(networkUid, networkAvgBlkTime, endPointList, token.contractAddress)
                : token.tokenType === TokenType.ERC_721
                    ? new Web3Erc721(networkUid, networkAvgBlkTime, endPointList, token.contractAddress)
                    : new Web3Erc1155(networkUid, networkAvgBlkTime, endPointList, token.contractAddress);
            const events = await ercWeb3.getTransferEventLogs({ fromBlock: tx.blockNumber, toBlock: tx.blockNumber });
            if (events) transferEvents.push(...events);
        }

        addERCListToLocalStore(transferEvents, localStore, network, walletList, web3Extended, tokenMap);

    }).catch(e => {
        console.error('Error fetching native transfer list:', e);
    });
}

async function addNativeListToLocalStore(
    list: TransactionMetaList,
    localStore: LocalStore,
    network: Network,
    walletList: string[],
    web3Extended: Web3Extended,
): Promise<void> {

    const nativeToken = await findToken({ network, localStore }) as Token;
    const mapList: AddZkTransferParamMap[] = []
    
    for (const tx of list) {
        
        const existingTransaction = localStore.getZkTransferByTransactionHash(network, tx.transactionReceipt.transactionHash.toString());
        if (existingTransaction) { continue; }
        
        const { transaction, transactionReceipt } = tx;
        const to = transaction.to as string;
        const from = transaction.from as string;
        const value = transaction.value ? web3NumbersToBigInt(transaction.value) : 0n;
        const blockNumber = web3NumbersToNumber(transactionReceipt.blockNumber);
        const transactionHash = transactionReceipt.transactionHash.toString();
        const transactionIndex = web3NumbersToNumber(transactionReceipt.transactionIndex);
        const gasPrice = transactionReceipt.effectiveGasPrice ? web3NumbersToBigInt(transactionReceipt.effectiveGasPrice) : 0n;
        const gasUsed = transactionReceipt.gasUsed ? web3NumbersToBigInt(transactionReceipt.gasUsed) : 0n;

        const block = await web3Extended.getBlock(blockNumber);
        const blockDateTime = web3NumbersToNumber(block.timestamp);

        mapList.push({
            token: nativeToken,
            cachedEventToRemove: undefined,
            transfer: {
                amounts: {
                    fromPublicAmount: value,
                    toPublicAmount: value,
                    gasUsed,
                    gasPrice,
                    gasFee: gasUsed * gasPrice,
                },
                blockNumber,
                blockDateTime,
                transactionIndex,
                transactionHash,
                from,
                to,
                ercApproveTxHash: '',
            },
        });
    }

    if (mapList.length === 0) return;

    try {
        const zKTxDBList = localStore.getModifier().azeroth.addZkTransfer({ network, mapList });
        consoleDebug(`successfully added ${zKTxDBList.length} native public transaction : `);
    } catch (error) {
        console.error(`Error adding native public transaction to DB : ${error}`);
    }
}

async function addERCListToLocalStore(
    list: ErcTransferEventLog[],
    localStore: LocalStore,
    network: Network,
    walletList: string[],
    web3Extended: Web3Extended,
    tokenMap?: Map<string, Token> | undefined,
): Promise<void> {

    const mapList: AddZkTransferParamMap[] = []

    const transactions = await web3Extended.getTransactionList(list.map(e => ({ transactionHash: e.transactionHash })));
    
    for (const event of list) {
        
        const existingTransaction = localStore.getZkTransferByTransactionHash(network, event.transactionHash);
        if (existingTransaction) { continue; }
        
        const { address } = event;
        const { transactionReceipt } = transactions.find(tx => tx.transactionReceipt.transactionHash === event.transactionHash) as TransactionMeta;
        const { to, from, transfers } = event.returnValues;
        const blockNumber = web3NumbersToNumber(transactionReceipt.blockNumber);
        const transactionHash = transactionReceipt.transactionHash.toString();
        const transactionIndex = web3NumbersToNumber(transactionReceipt.transactionIndex);
        const gasPrice = transactionReceipt.effectiveGasPrice ? web3NumbersToBigInt(transactionReceipt.effectiveGasPrice) : 0n;
        const gasUsed = transactionReceipt.gasUsed ? web3NumbersToBigInt(transactionReceipt.gasUsed) : 0n;

        const block = await web3Extended.getBlock(blockNumber);
        const blockDateTime = web3NumbersToNumber(block.timestamp);

        let token: Token | undefined = tokenMap !== undefined ? tokenMap.get(address) : undefined;
        if (token === undefined) {
            token = await findToken({
                localStore,
                network,
                contractAddress: address,
                addToLocalStoreIfNotExist: false,
            }) as Token;
        }
        
        for (const transfer of transfers) {
            mapList.push({
                token,
                cachedEventToRemove: undefined,
                transfer: {
                    amounts: {
                        fromPublicAmount: transfer.value,
                        toPublicAmount: transfer.value,
                        gasUsed,
                        gasPrice,
                        gasFee: gasUsed * gasPrice,
                    },
                    blockNumber,
                    blockDateTime,
                    transactionIndex,
                    transactionHash,
                    from,
                    to,
                    ercApproveTxHash: '',
                },
            });
        }
    }

    if (mapList.length === 0) return;

    try {
        const zKTxDBList = localStore.getModifier().azeroth.addZkTransfer({ network, mapList });
        consoleDebug(`successfully added ${zKTxDBList.length} erc token public transaction : `);
    } catch (error) {
        console.error(`Error adding erc token public transaction to DB : ${error}`);
    }
}

function consoleDebug(message?: any, ...optionalParams: any[]): void {
    // console.debug(message, ...optionalParams);
}