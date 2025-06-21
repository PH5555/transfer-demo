import { Filter } from "web3";
import Web3Ext, { } from './web3-extended';
import ABI from './erc-abi';
import { z } from 'zod';
import {
    EndPointMeta,
    ErcTransferEventLog,
    SendContractTransactionResult,
    TokenType,
    TokenUniqueID
} from './types';

const TransferSingleReturnValuesSchema = z.object({
    from: z.string(),
    to: z.string(),
    id: z.bigint(),
    value: z.bigint(),
    operator: z.string().optional(),
});

const TransferBatchReturnValuesSchema = z.object({
    from: z.string(),
    to: z.string(),
    ids: z.array(z.bigint()),
    values: z.array(z.bigint()),
    operator: z.string().optional(),
});

export default class Web3Erc1155 extends Web3Ext {

    constructor(
        networkUid: TokenUniqueID,
        networkAvgBlkTime: number,
        endPointList: EndPointMeta[],
        contractAddress: string
    ) {
        super({
            networkUid,
            networkAvgBlkTime,
            endPointList,
            contract: { contractAddress, abi: ABI.ERC1155 }
        });
    }
 
    getErcType(): TokenType {
        return TokenType.ERC_1155;
    }

    async balanceOf(address: string, tokenID: bigint) {
        return await this.sendContractCall({ methodName: 'balanceOf', methodArgs: [address, tokenID] });
    }

    async getTransferEventLogs(filterParams: Filter): Promise<ErcTransferEventLog[]> {
        
        const events: ErcTransferEventLog[] = [];
        
        {
            const { eventLogs, error } = (await this.getPastEventLogs(
                'TransferSingle',
                filterParams,
            ));

            if (error) console.warn(error);

            try {
                for (const ethEvent of (eventLogs || [])) {
                    const returnValues = TransferSingleReturnValuesSchema.parse(ethEvent.returnValues);
                    events.push({
                        ...ethEvent,
                        returnValues: {
                            from: returnValues.from,
                            to: returnValues.to,
                            transfers: [{ value: returnValues.value , tokenID: returnValues.id }]
                        }
                    });
                }
            } catch (error) {
                throw new Error(`Error parsing ERC_1155 {TransferSingle} event return values : ${error}`);
            }
        }

        {
            const { eventLogs, error } = (await this.getPastEventLogs(
                'TransferBatch',
                filterParams,
            ));

            if (error) console.warn(error);

            try {
                for (const ethEvent of (eventLogs || [])) {
                    const returnValues = TransferBatchReturnValuesSchema.parse(ethEvent.returnValues);
                    events.push({
                        ...ethEvent,
                        returnValues: {
                            from: returnValues.from,
                            to: returnValues.to,
                            transfers: returnValues.ids.map((id, index) => {
                                return { value: returnValues.values.at(index) || 0n, tokenID: id }
                            })
                        }
                    });
                }
            } catch (error) {
                throw new Error(`Error parsing ERC_1155 {TransferBatch} event return values : ${error}`);
            }
        }

        return events;
    }

    async totalSupply(tokenID: number) {
        return await this.sendContractCall({ methodName: 'totalSupply', methodArgs: [tokenID] });
    }

    async setApprovalForAll(
        {
            from,
            to,
            privateKey,
        }: {
            from: string,
            to: string,
            privateKey: string,
        }
    ): Promise<SendContractTransactionResult> {
        return await this.sendContractTransaction({
            methodName: 'setApprovalForAll',
            methodArgs: [to, true],
            senderEthAddr: from,
            senderEthPrivateKey: privateKey,
            estimateGasFeeOnly: false,
        });
    }

    async transfer(
        {
            from,
            to,
            tokenID,
            amount,
            privateKey,
        }: {
            from: string,
            to: string,
            tokenID: bigint,
            amount: bigint,
            privateKey: string,
        }
    ): Promise<SendContractTransactionResult> {
        return await this.sendContractTransaction({
            methodName: 'safeTransferFrom',
            methodArgs: [from, to, tokenID, amount, "0x"],
            senderEthAddr: from,
            senderEthPrivateKey: privateKey,
            estimateGasFeeOnly: false,
            fetchBlock: true,
        });
    }

    async batchTransfer(
        {
            from,
            to,
            transfers,
            privateKey,
        }: {
            from: string,
            to: string,
            transfers: { tokenID: bigint, amount: bigint }[],
            privateKey: string,
        }
    ): Promise<SendContractTransactionResult> {
        return await this.sendContractTransaction({
            methodName: 'safeBatchTransferFrom',
            methodArgs: [from, to, transfers.map(t => t.tokenID), transfers.map(t => t.amount), "0x"],
            senderEthAddr: from,
            senderEthPrivateKey: privateKey,
            estimateGasFeeOnly: false,
            fetchBlock: true,
        });
    }

    async getTokenURI(tokenID: bigint) {
        return await this.sendContractCall({ methodName: 'uri', methodArgs: [tokenID] });
    }

    async name() {
        return await this.sendContractCall({ methodName: 'name', methodArgs: [] });
    }

    async symbol() {
        return await this.sendContractCall({ methodName: 'symbol', methodArgs: [] });
    }

    async supportsInterface() {
        return await this.sendContractCall({ methodName: 'supportsInterface', methodArgs: ['0xd9b67a26'] });
    }
}
