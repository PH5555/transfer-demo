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

const ReturnValuesSchema = z.object({
    from: z.string(),
    to: z.string(),
    tokenId: z.bigint(),
});

export default class Web3Erc721 extends Web3Ext {

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
            contract: { contractAddress, abi: ABI.ERC721 }
        });
    }

    getErcType(): TokenType {
        return TokenType.ERC_721;
    }

    async isOwner(address: string, tokenID: bigint) {
        const owner = (await this.ownerOf(tokenID)).toString();
        return owner.toLowerCase() === address.toLowerCase();
    }

    async ownerOf(tokenID: bigint) {
        return await this.sendContractCall({ methodName: 'ownerOf', methodArgs: [tokenID] });
    }

    async getTransferEventLogs(filterParams: Filter): Promise<ErcTransferEventLog[]> {
        
        const events: ErcTransferEventLog[] = [];
        
        const { eventLogs, error } = (await this.getPastEventLogs(
            'Transfer',
            filterParams,
        ));

        if (error) console.warn(error);

        try {
            for (const ethEvent of (eventLogs || [])) {
                const returnValues = ReturnValuesSchema.parse(ethEvent.returnValues);
                events.push({
                    ...ethEvent,
                    returnValues: {
                        from: returnValues.from,
                        to: returnValues.to,
                        transfers: [{ value: 1n, tokenID: returnValues.tokenId }]
                    }
                });
            }
        } catch (error) {
            throw new Error(`Error parsing ERC_721 event return values : ${error}`);
        }

        return events;
    }

    async totalSupply() {
        return await this.sendContractCall({ methodName: 'totalSupply', methodArgs: [] });
    }

    async approve(
        {
            from,
            to,
            privateKey,
            tokenID
        }: {
            from: string,
            to: string,
            privateKey: string,
            tokenID: bigint
        }
    ): Promise<SendContractTransactionResult> {
        return await this.sendContractTransaction({
            methodName: 'approve',
            methodArgs: [to, tokenID],
            senderEthAddr: from,
            senderEthPrivateKey: privateKey,
            estimateGasFeeOnly: false,
        });
    }

    async getApproved(tokenID: number) {
        return await this.sendContractCall({ methodName: 'getApproved', methodArgs: [tokenID] });
    }

    async transfer(
        {
            from,
            to,
            tokenID,
            privateKey,
        }: {
            from: string,
            to: string,
            tokenID: bigint,
            privateKey: string,
        }
    ): Promise<SendContractTransactionResult> {
        return await this.sendContractTransaction({
            methodName: 'transferFrom',
            methodArgs: [from, to, tokenID],
            senderEthAddr: from,
            senderEthPrivateKey: privateKey,
            estimateGasFeeOnly: false,
            fetchBlock: true,
        });
    }

    async getTokenURI(tokenID: bigint) {
        return await this.sendContractCall({ methodName: 'tokenURI', methodArgs: [tokenID] });
    }

    async name() {
        return await this.sendContractCall({ methodName: 'name', methodArgs: [] });
    }

    async symbol() {
        return await this.sendContractCall({ methodName: 'symbol', methodArgs: [] });
    }

    async supportsInterface() {
        return await this.sendContractCall({ methodName: 'supportsInterface', methodArgs: ['0x80ac58cd'] });
    }
}
