import _ from 'lodash';
import { z } from 'zod';
import {
    EndPointProtocol,
    EndPoint,
    NativePublicTransfer,
    ERCTokenPublicTransfer,
    IWeb3Extended
} from './types';
import {
    web3NumbersToBigInt,
    web3NumbersToNumber
} from './utils';

const BlockscoutTxListResponseSchema = z.object({
    status: z.string(),
    result: z.array(z.object({
        hash: z.string(),
        from: z.string(),
        to: z.string(),
        value: z.string(),
        gasUsed: z.string(),
        gasPrice: z.string(),
        blockNumber: z.string(),
        timeStamp: z.string(),
        transactionIndex: z.string(),
    })),
    message: z.string(),
});

const BlockscoutTokenTxResponseSchema = z.object({
    status: z.string(),
    result: z.array(z.object({
        contractAddress: z.string(),
        hash: z.string(),
        blockHash: z.string(),
        from: z.string(),
        to: z.string(),
        gasUsed: z.string(),
        gasPrice: z.string(),
        blockNumber: z.string(),
        timeStamp: z.string(),
        transactionIndex: z.string(),
        tokenName: z.string().optional(),
        tokenSymbol: z.string().optional(),
        tokenID: z.string().optional(),
        tokenIDs: z.array(z.string()).optional(),
        value: z.string().optional(),
        values: z.array(z.string()).optional(),
    })),
    message: z.string(),
});
 
export const IndexerProtocols: EndPointProtocol[] = [
    EndPointProtocol.BLOCKSCOUT_API,
    EndPointProtocol.BLOCKSCOUT_RESTFULL_API,
    EndPointProtocol.ZKWALLET_SUPPORT_BACKEND,
];

export async function fetchIndexerTransferList(
    web3: IWeb3Extended,
    endPoint: EndPoint,
    addressList: string[],
    blockRange: { from: number; to: number },
    tokenType: 'Native' | 'ERC',
): Promise<NativePublicTransfer[] | ERCTokenPublicTransfer[]> {

    if (tokenType === 'Native') {
        
        const list: NativePublicTransfer[] = [];
        
        if (endPoint.supportedProtocols.includes(EndPointProtocol.BLOCKSCOUT_API)) {
         
            for (const address of addressList) {
                
                const url = `${endPoint.url}/api?module=account&action=txlist&address=${address}&startblock=${blockRange.from}&endblock=${blockRange.to}&sort=asc`;
                let responseText: string;
                let responseData;

                try {
                    const response = await fetch(url);
                    responseText = await response.text();
                } catch (error) {
                    throw (`Error fetching native transfers list : ${error}`);
                }

                try {
                    const data = JSON.parse(responseText);
                    responseData = BlockscoutTxListResponseSchema.parse(data);
                } catch (error) {
                    throw (`Error parsing native transfers response : ${error}`);
                }

                if (responseData.status !== '1') continue;
                
                list.push(
                    ...responseData.result.map(tx => ({
                        from: tx.from,
                        to: tx.to,
                        value: web3NumbersToBigInt(tx.value),
                        transactionHash: tx.hash,
                        blockNumber: web3NumbersToNumber(tx.blockNumber),
                        blockDateTime: web3NumbersToNumber(tx.timeStamp),
                        transactionIndex: web3NumbersToNumber(tx.transactionIndex),
                        gasPrice: web3NumbersToBigInt(tx.gasPrice),
                        gasUsed: web3NumbersToBigInt(tx.gasUsed),
                    })));
            }

        } else {
            console.error(`Protocol BLOCKSCOUT_API is not supported by the endpoint.`);
        }

        return list;
    } else if (tokenType === 'ERC') {
        
        const list: ERCTokenPublicTransfer[] = [];
        
        if (endPoint.supportedProtocols.includes(EndPointProtocol.BLOCKSCOUT_API)) {
         
            for (const address of addressList) {
                 
                const url = encodeURI(`${endPoint.url}/api?module=account&action=tokentx&address=${address}&sort=des&startblock=${blockRange.from}&endblock=${blockRange.to}`);
                let responseText: string;
                let responseData;

                try {
                    const response = await fetch(url);
                    responseText = await response.text();
                } catch (error) {
                    throw (`Error fetching erc token transfers list : ${error}`);
                }

                try {
                    const data = JSON.parse(responseText);
                    responseData = BlockscoutTokenTxResponseSchema.parse(data);
                } catch (error) {
                    throw (`Error parsing erc token transfers response : ${error}`);
                }

                if (responseData.status !== '1') continue;
                
                list.push(
                    ...responseData.result.map(tx => ({
                        contractAddress: tx.contractAddress,
                        from: tx.from,
                        to: tx.to,
                        values: [
                            ...(tx.value !== undefined ? [web3NumbersToBigInt(tx.value)] : []),
                            ...(tx.values !== undefined ? tx.values.map(v => web3NumbersToBigInt(v)) : []),
                        ],
                        tokenIDs: [
                            ...(tx.tokenID !== undefined ? [web3NumbersToBigInt(tx.tokenID)] : []),
                            ...(tx.tokenIDs !== undefined ? tx.tokenIDs.map(v => web3NumbersToBigInt(v)) : []),
                        ],
                        transactionHash: tx.hash,
                        blockNumber: web3NumbersToNumber(tx.blockNumber),
                        blockDateTime: web3NumbersToNumber(tx.timeStamp),
                        transactionIndex: web3NumbersToNumber(tx.transactionIndex),
                        gasPrice: web3NumbersToBigInt(tx.gasPrice),
                        gasUsed: web3NumbersToBigInt(tx.gasUsed),
                    })));
            }

        } else {
            console.error(`Protocol BLOCKSCOUT_API is not supported by the endpoint.`);
        }

        return list;

    } else {
        return [];
    }
}
