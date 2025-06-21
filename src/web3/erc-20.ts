import { Filter } from "web3";
import Web3Ext from './web3-extended';
import ABI from './erc-abi';
import { z } from 'zod';
import {
    EndPointMeta,
    ErcTransferEventLog, 
    SendContractTransactionResult,
    TokenType,
    TokenUniqueID
} from './types'; 

const ReturnValuesSchema = z.object({
    from: z.string(),
    to: z.string(),
    value: z.bigint(),
});

export default class Web3Erc20 extends Web3Ext {

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
            contract: { contractAddress, abi: ABI.ERC20 }
        });
    }

    getErcType(): TokenType {
        return TokenType.ERC_20;
    }

    async balanceOf(address: string) {
        return await this.sendContractCall({ methodName: 'balanceOf', methodArgs: [address] });
    }

    async ownerOf(address: string) {
        const balance = await this.sendContractCall({ methodName: 'balanceOf', methodArgs: [address] });
        return balance > 0;
    }

    async getTransferEventLogs(filterParams: Filter): Promise<ErcTransferEventLog[]> {
        
        const events: ErcTransferEventLog[] = [];
        
        const { eventLogs, error } = (await this.getPastEventLogs(
            'Transfer',
            filterParams,
        )) ;

        if (error) console.warn(error);

        try {
            for (const ethEvent of (eventLogs || [])) {
                const returnValues = ReturnValuesSchema.parse(ethEvent.returnValues);
                events.push({
                    ...ethEvent,
                    returnValues: {
                        from: returnValues.from,
                        to: returnValues.to,
                        transfers : [{value : returnValues.value , tokenID: undefined}]
                    }
                });
            }
        } catch (error) {
            throw new Error(`Error parsing ERC_20 event return values : ${error}`);
        }

        return events;
    }

    async transfer(
        {
            from,
            to,
            amount,
            privateKey,
        }: {
            from: string,
            to: string,
            amount: bigint,
            privateKey: string,
        }
    ): Promise<SendContractTransactionResult> {

        return await this.sendContractTransaction({
            methodName: 'transfer',
            methodArgs: [to, amount],
            senderEthAddr: from,
            senderEthPrivateKey: privateKey,
            estimateGasFeeOnly: false,
            fetchBlock: true,
        });
    }

    async approve(
        {
            from,
            to,
            amount,
            privateKey,
        }: {
            from: string,
            to: string,
            amount: bigint,
            privateKey: string
        }
    ): Promise<SendContractTransactionResult> {
        return await this.sendContractTransaction({
            methodName: 'approve',
            methodArgs: [to, amount],
            senderEthAddr: from,
            senderEthPrivateKey: privateKey,
            estimateGasFeeOnly: false,
        });
    }

    async name() {
        return await this.sendContractCall({ methodName: 'name', methodArgs: [] });
    }

    async symbol() {
        return await this.sendContractCall({ methodName: 'symbol', methodArgs: [] });
    }

    async totalSupply() {
        return await this.sendContractCall({ methodName: 'totalSupply', methodArgs: [] });
    }

    async decimals(): Promise<number> {
        return await this.sendContractCall({ methodName: 'decimals', methodArgs: [] })
    }

    async getApproved(owner: string, spender: string, amount: bigint, tokenId?: string): Promise<bigint> {
        return amount - (await this.allowance(owner, spender));
    }

    async allowance(owner: string, spender: string): Promise<bigint> {

        try {
            return BigInt((await this.sendContractCall({ methodName: 'allowance', methodArgs: [owner, spender] })).toString());
        } catch (error) {
            return 0n;
        }
    }

}
