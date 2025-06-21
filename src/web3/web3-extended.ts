import _ from 'lodash';
import Web3, {
    ContractAbi,
    Filter,
    Contract, 
    Block
} from 'web3';
import { SignTransactionResult } from 'web3-eth-accounts';
import { ContractMethodsInterface } from "web3-eth-contract/src/contract";
import { AbiItem, numberToHex } from 'web3-utils';
import {
    EndPointMetric,
    EndPointProtocol,
    EndPointStatus,
    GasEstimation,
    EndPoint,
    SendContractTransactionResult,
    TokenUniqueID,
    EndPointMeta, 
    TransactionFilterList,
    TransactionFilter,
    TransactionMeta,
    TransactionMetaList,
    RequestFtn,
    NativePublicTransferList,
    EventLog,
    ERCTokenPublicTransferList,
} from './types';
import { stringify } from './utils';
import { GasHelper, genTokenUniqueID, isValidAddress } from './web3-extended-utils';
import { fetchIndexerTransferList, IndexerProtocols } from './web3-extended-indexer-client';
import { endPointRetryBlock, filterEndPointListByProtocol } from './web3-extended-endpoint-rotation';
import {
    consoleLogGasEstimation,
    log,
    logError,
    logMethodParam
} from './web3-extended-log';
import {
    addCachedBlock,
    addEoaAddressType,
    getCachedBlock,
    getEoaAddressType
} from './web3-extended-cache';
import { fetchPastEventLogs } from './web3-extended-event-log';


export default class Web3Extended extends Web3 {

    private readonly networkUid: TokenUniqueID;
    private readonly networkAvgBlkTime: number;
    private readonly endPointList: EndPoint[];
    private readonly ethEndPointList: EndPoint[];
    private readonly ethPrimaryEndPointList: EndPoint[];
    private lastUsedEndPoint: EndPoint;

    private readonly contract!: {
        contractAddress: string;
        abi: any;
        contract: Contract<ContractAbi>;
        methods: ContractMethodsInterface<ContractAbi>;
    } | undefined;

    constructor({
        networkUid,
        endPointList,
        networkAvgBlkTime,
        contract
    }: {
        networkUid: TokenUniqueID,
        endPointList: EndPointMeta[],
        networkAvgBlkTime: number,
        contract?: { contractAddress: string, abi: AbiItem[] } | undefined,
    }) {

        const { list, ethList, primaryList, base } = Web3Extended.processEndPoints(endPointList);
        super(base.url);

        this.networkUid = networkUid;
        this.networkAvgBlkTime = networkAvgBlkTime;
        this.endPointList = list;
        this.ethEndPointList = ethList;
        this.ethPrimaryEndPointList = primaryList;
        this.lastUsedEndPoint = base;

        if (contract && Web3Extended.utils.isValidAddress(contract.contractAddress)) {
            const contract_p = new this.eth.Contract(contract.abi, contract.contractAddress);
            this.contract = {
                ...contract,
                contract: contract_p,
                methods: contract_p.methods,
            };
        }
    }

    private static processEndPoints(endPointList: EndPointMeta[]) {

        const list: EndPoint[] = endPointList.map(
            endPoint => ({
                ...endPoint,
                status: EndPointStatus.UP,
                skipCount: 0
            })
        );

        const ethList: EndPoint[] = filterEndPointListByProtocol(list, EndPointProtocol.ETH);

        const primaryList = ethList.filter(
            endPoint => endPoint.metric <= EndPointMetric.SELF_HOSTED
        );

        let useAsPrimary = primaryList.length ? primaryList[0] : ethList.length ? ethList[0] : list[0];

        ethList.forEach(
            endPoint => {
                if (endPoint.metric < useAsPrimary.metric) {
                    useAsPrimary = endPoint;
                }
            }
        );

        return { list, ethList, primaryList, base: useAsPrimary };
    }

    getAddress() {
        return this.contract?.contractAddress || '0x0';
    }

    // 여기
    async sendNativeTokenTransfer(
        {
            senderEthAddr,
            receiverEthAddr,
            senderEthPrivateKey,
            value,
            fetchBlock = false,
        }: {
            senderEthAddr: string,
            receiverEthAddr: string,
            senderEthPrivateKey: string | null,
            value: bigint,
            fetchBlock?: boolean,
        }
    ): Promise<SendContractTransactionResult> {

        const txValue = value;

        consoleDebugExtra("value : ", (txValue ? txValue.toString(10) : undefined));

        const gasEstimation: GasEstimation = {
            possibleOverShot: false,
            gasEstimate: 0n,
            gasPrice: 0n,
            gasFee: 0n,
            senderBalance: 0n,
            overShotBy: 0n,
            value: value,
            txCost: 0n,
        };

        let txDescription: any = {
            from: senderEthAddr,
            to: receiverEthAddr,
            value: txValue,
        };

        try {
            consoleDebugExtra("get gas estimate ... ");
            const requestFtn: RequestFtn<any> = (web3) => web3.eth.estimateGas(txDescription);
            const gasEstimateNum = await this.endPointRetryBlock<any>(requestFtn, 'sendNativeTokenTransfer::estimateGas');
            gasEstimation.gasEstimate = GasHelper.gasPay(gasEstimateNum);
            consoleDebugExtra("get gas estimate ... =", gasEstimateNum.toString(), ", gas to pay =", gasEstimation.gasEstimate.toString(10));
        } catch (error) {
            console.error(`estimateGas Error : ${error}`)
            return { error: new Error(`estimateGas Error : ${error}`) };
        }

        // estimate min balance for gas price
        try {
            const requestFtn: RequestFtn<any> = (web3) => web3.eth.getGasPrice();
            const gasPriceStr = await this.endPointRetryBlock(requestFtn, 'sendNativeTokenTransfer::getGasPrice', true);
            gasEstimation.gasPrice = BigInt(gasPriceStr);
        } catch (error) {
            return { error: new Error(`getGasPrice Error : ${error}`) };
        }

        // get sender native balance
        try {
            const requestFtn: RequestFtn<any> = (web3) => web3.eth.getBalance(senderEthAddr);
            const senderEthAddrBalStr = await this.endPointRetryBlock(requestFtn, 'sendNativeTokenTransfer::getBalance', true);
            gasEstimation.senderBalance = BigInt(senderEthAddrBalStr);
        } catch (error) {
            return { error: new Error(`getBalance Error : ${error}`) };
        }

        gasEstimation.gasFee = gasEstimation.gasEstimate * gasEstimation.gasPrice;
        gasEstimation.txCost = gasEstimation.gasFee + gasEstimation.value;

        if (gasEstimation.txCost >= gasEstimation.senderBalance) {
            gasEstimation.possibleOverShot = true;
            gasEstimation.overShotBy = gasEstimation.txCost - gasEstimation.senderBalance;
        }

        consoleDebug(consoleLogGasEstimation(gasEstimation));


        //
        //  Send transaction section
        //

        if (senderEthPrivateKey === null || senderEthPrivateKey === undefined) {
            return { error: new Error('Error @ sendNativeTokenTransaction , sender private key is undefined') };
        }

        txDescription.gas = gasEstimation.gasEstimate;
        txDescription.gasPrice = gasEstimation.gasPrice;

        let signedTx
        try {
            consoleDebug("Signing tx ... ");
            const requestFtn: RequestFtn<SignTransactionResult> = (web3) => web3.eth.accounts.signTransaction(txDescription, senderEthPrivateKey);
            signedTx = await this.endPointRetryBlock(requestFtn, 'sendNativeTokenTransfer::signTransaction', true);
            log('sendNativeTokenTransfer', { SignedTxHash: signedTx.transactionHash });
        } catch (error) {
            logError('signing transaction failed :', `${error}`)
            return { error: new Error(`signing transaction failed : ${error}`) };
        }

        const result: SendContractTransactionResult = {
            gasEstimation,
            transactionReceipt: undefined,
            transactionBlock: undefined,
            error: undefined,
        };

        try {
            consoleDebug("Sending signed tx ....")
            const requestFtn: RequestFtn<any> = (web3) => web3.eth.sendSignedTransaction(signedTx.rawTransaction);
            const txReceipt = await this.endPointRetryBlock(requestFtn, 'sendNativeTokenTransfer::sendSignedTransaction', true);
            log('sendNativeTokenTransfer', { TxReceiptBlockNum: txReceipt.blockNumber });
            result.transactionReceipt = txReceipt;
        } catch (error: any) {
            logError('sendNativeTokenTransfer', { Error: "Sending signed Tx error :", ErrorDetails: error });
            result.error = {
                at: `sendNativeTokenTransaction:eth.sendSignedTransaction, txDescription='${txDescription}'`,
                msg: error.toString()
            };
        }

        const receipt = result.transactionReceipt;
        if (fetchBlock === true && receipt !== undefined) {
            try {
                consoleDebug("Fetching tx block information ....")
                const transactionBlock = await this.getBlock(receipt.blockHash.toString());
                log('getBlock', { TxBlockHash: (transactionBlock.hash || '').toString(), TxBlockTimeStamp: transactionBlock.timestamp.toString(10) });
                result.transactionBlock = transactionBlock;
            } catch (error: any) {
                logError('sendNativeTokenTransfer', { Error: `Fetch block [${receipt.blockNumber}] error :`, ErrorDetails: error });
            }
        }

        return result;
    }

    async sendContractTransaction(
        {
            methodName,
            methodArgs,
            senderEthAddr,
            senderEthPrivateKey,
            value = 0n,
            estimateGasFeeOnly,
            fetchBlock = false,
        }: {
            methodName: string,
            methodArgs: any[],
            senderEthAddr: string,
            senderEthPrivateKey: string | null,
            value?: bigint,
            estimateGasFeeOnly: boolean,
            fetchBlock?: boolean,
        }
    ): Promise<SendContractTransactionResult> {

        if (this.contract === undefined) {
            return { error: new Error(`sendContractTransaction Error : contract address not specified`) };
        }
        const { methods, abi, contractAddress } = this.contract;

        const txValue = value;

        logMethodParam('sendContractTransaction', methodName, methodArgs);
        consoleDebugExtra("senderEthAddr : ", senderEthAddr);
        consoleDebugExtra("value : ", (txValue ? txValue.toString() : undefined));

        const callMethod = _.get(methods, methodName)
        if (callMethod === undefined || callMethod === null) {
            logError('sendContractTransaction', { Error: "Method not found", MethodName: methodName });
            return { error: new Error(`sendContractMethodCall Error : method "${methodName}" not found`) };
        }

        const call = callMethod(...methodArgs);
        if (callMethod === undefined || callMethod === null) {
            return { error: new Error(`sendContractMethodCall Error`) };
        }

        const gasEstimation: GasEstimation = {
            possibleOverShot: false,
            gasEstimate: 0n,
            gasPrice: 0n,
            gasFee: 0n,
            senderBalance: 0n,
            overShotBy: 0n,
            value: value,
            txCost: 0n,
        };

        try {
            consoleDebugExtra("get gas estimate ... ");

            const requestFtn: RequestFtn<any> = (web3) => {
                return (_.get(methods, methodName))(...methodArgs).estimateGas({ from: senderEthAddr, value: numberToHex(txValue) });
            };

            const gasEstimateNum = await this.endPointRetryBlock<any>(requestFtn, 'sendContractTransaction::estimateGas');

            gasEstimation.gasEstimate = GasHelper.gasPay(gasEstimateNum);
            consoleDebugExtra("get gas estimate ... =", gasEstimateNum.toString(), ", gas to pay =", gasEstimation.gasEstimate.toString(10));
        } catch (error) {
            logError('sendContractTransaction', { Error: "Estimate gass failed", ErrorDetails: error });
            return { error: new Error(`estimateGas Error : ${error}`) };
        }

        // estimate min balance for gas price
        try {
            consoleDebugExtra("get gas price ... ");
            const requestFtn: RequestFtn<any> = (web3) => web3.eth.getGasPrice();
            const gasPriceStr = await this.endPointRetryBlock<any>(requestFtn, 'sendContractTransaction::getGasPrice', true);
            gasEstimation.gasPrice = BigInt(gasPriceStr);
            consoleDebugExtra("get gas price ... =", gasPriceStr);
        } catch (error) {
            logError('sendContractTransaction', { Error: "Get gass price failed", ErrorDetails: error });
            return { error: new Error(`getGasPrice Error : ${error}`) };
        }

        // get sender native balance
        try {
            const requestFtn: RequestFtn<any> = (web3) => web3.eth.getBalance(senderEthAddr);
            const senderEthAddrBalStr = await this.endPointRetryBlock<any>(requestFtn, 'sendContractTransaction::getBalance', true);
            gasEstimation.senderBalance = BigInt(senderEthAddrBalStr);
        } catch (error) {
            logError('sendContractTransaction', { Error: "Get balance failed", ErrorDetails: error });
            return { error: new Error(`getBalance Error : ${error}`) };
        }

        gasEstimation.gasFee = gasEstimation.gasEstimate * gasEstimation.gasPrice;
        gasEstimation.txCost = gasEstimation.gasFee + gasEstimation.value;

        if (gasEstimation.txCost >= gasEstimation.senderBalance) {
            gasEstimation.possibleOverShot = true;
            gasEstimation.overShotBy = gasEstimation.txCost - gasEstimation.senderBalance;
        }

        consoleDebug(consoleLogGasEstimation(gasEstimation));

        if (estimateGasFeeOnly) {
            return { gasEstimation };
        }


        //
        //  Send transaction section
        //

        if (senderEthPrivateKey === null || senderEthPrivateKey === undefined) {
            return { error: new Error('Error @ sendContractMethodCall , sender private key is undefined') };
        }

        const encodedABI = call.encodeABI();

        let txDescription: any = {
            data: encodedABI,
            from: senderEthAddr,
            to: contractAddress,
            gas: gasEstimation.gasEstimate,
            gasPrice: gasEstimation.gasPrice,
        };

        if (txValue) {
            txDescription.value = txValue;
        }

        let signedTx
        try {
            consoleDebug("Signing tx ... ");
            const requestFtn: RequestFtn<SignTransactionResult> = (web3) => web3.eth.accounts.signTransaction(txDescription, senderEthPrivateKey);
            signedTx = await this.endPointRetryBlock<SignTransactionResult>(requestFtn, 'sendNativeTokenTransfer::signTransaction', true);
            log('sendContractTransaction', { SignedTxHash: signedTx.transactionHash });
        } catch (error) {
            logError('sendContractTransaction', { Error: "Sign Tx failed", ErrorDetails: error });
            return { error: new Error(`signing transaction failed : ${error}`) };
        }

        const result: SendContractTransactionResult = {
            gasEstimation,
            transactionReceipt: undefined,
            transactionBlock: undefined,
            error: undefined,
        };

        try {
            consoleDebug("Sending signed tx ....")
            const requestFtn: RequestFtn<any> = (web3) => web3.eth.sendSignedTransaction(signedTx.rawTransaction);
            const txReceipt = await this.endPointRetryBlock(requestFtn, 'sendNativeTokenTransfer::sendSignedTransaction', true);
            log('sendContractTransaction', { TxReceiptBlockNum: txReceipt.blockNumber });
            result.transactionReceipt = txReceipt;
        } catch (error: any) {
            logError('sendContractTransaction', { Error: "Send singed Tx failed", ErrorDetails: error });
            result.error = {
                at: `sendContractMethodCall:eth.sendSignedTransaction, method='${methodName}'`,
                msg: error.toString()
            };
        }

        const receipt = result.transactionReceipt;
        if (fetchBlock === true && receipt !== undefined) {
            try {
                consoleDebug("Fetching tx block information ....")
                const transactionBlock = await this.getBlock(receipt.blockHash.toString());
                log('getBlock', { TxBlockHash: (transactionBlock.hash || '').toString(), TxBlockTimeStamp: transactionBlock.timestamp.toString(10) });
                result.transactionBlock = transactionBlock;
            } catch (error: any) {
                logError('sendContractMethodCall', { Error: `Fetch block [${receipt.blockNumber}] error :`, ErrorDetails: error });
            }
        }

        return result;
    }

    async sendContractCall(
        {
            methodName,
            methodArgs
        }: {
            methodName: string,
            methodArgs: any[]
        }
    ): Promise<any> {

        if (this.contract === undefined) {
            return { error: new Error(`sendContractMethodCall Error : contract address not specified`) };
        }
        const { methods } = this.contract;

        logMethodParam('sendContractCall', methodName, methodArgs);

        const callMethod = _.get(methods, methodName)
        if (callMethod === undefined || callMethod === null) {
            logError('sendContractCall', { Error: "Method not found", MethodName: methodName });
            throw new Error(`sendContractMethodCall Error : method "${methodName}" not found`);
        }

        const call = callMethod(...methodArgs);

        if (callMethod === undefined || callMethod === null) {
            throw new Error(`sendContractMethodCall Error`);
        }

        const requestFtn: RequestFtn<any> = (web3) => {
            return call.call();
        };

        let callResult;
        try {
            callResult = await this.endPointRetryBlock<any>(requestFtn, 'sendContractCall');
            log('sendContractCall', { CallReply: callResult });
            return callResult;
        } catch (error) {
            logError('sendContractCall', { Error: "Call failed", ErrorDetails: error });
            throw error;
        }
    }

    async getPastEventLogs<ReturnValuesT = any>(
        eventName: string,
        filterParams: Filter
    ): Promise<{
        eventLogs: EventLog[] | undefined;
        error: any
    }> {

        log('getPastEventLogs', { eventName, filterParams });
        const contract  = this.contract;
        if ( contract === undefined) {
            return {
                eventLogs: undefined,
                error: new Error(`getPastEventLogs Error : contract address not specified`)
            };
        }
        
        const requestFtn: RequestFtn<EventLog<ReturnValuesT>[]> = () => fetchPastEventLogs<ReturnValuesT>(eventName, filterParams, contract.contract);
        
        try {
            const eventLogs = await this.endPointRetryBlock( requestFtn, `getPastEventLogs:${eventName}`);
            consoleDebugExtra("\nWeb3Extended::getPastEventLogs Reply :\n", stringify(eventLogs, 2));
            return { eventLogs, error: undefined };
        } catch (error) {
            return { eventLogs: undefined, error };
        }
    }

    async getBlockNumber(): Promise<number> {
        const requestFtn: RequestFtn<bigint> = (web3) => web3.eth.getBlockNumber();
        const blockNumber = await this.endPointRetryBlock(requestFtn, 'getBlockNumber');
        return Number(blockNumber.toString(10));
    }

    async getBalance(address: string): Promise<bigint> {
        const requestFtn: RequestFtn<any> = (web3) => web3.eth.getBalance(address);
        return await this.endPointRetryBlock(requestFtn, 'getBalance', true);
    }

    async getBlock(blockNumberOrHash: string | number , useCache: boolean = true): Promise<Block> {
        
        const requestFtn: RequestFtn<Block> = (web3) => web3.eth.getBlock(blockNumberOrHash, false);

        if (!useCache) {
            return await this.endPointRetryBlock(requestFtn, 'getBlock');
        }

        const cachedBlk = getCachedBlock(blockNumberOrHash, this.networkUid);

        if (cachedBlk !== undefined) return cachedBlk;
        
        const blk = await this.endPointRetryBlock(requestFtn, 'getBlock');
        addCachedBlock(blk, this.networkUid);
        return blk;

    }

    async isEoaAddress(address: string, useCache: boolean = true): Promise<boolean> {
        
        const requestFtn: RequestFtn<boolean> = async (web3) => {
            let contractCode;
            contractCode = await web3.eth.getCode(address);
            const isEOA = contractCode !== undefined && (contractCode === '0x' || contractCode === '0x0');
            return isEOA;
        }

        if (!useCache) {
            return await this.endPointRetryBlock(requestFtn, 'isEoaAddress');
        }

        const cached = getEoaAddressType(address, this.networkUid);

        if (cached !== undefined) return cached.isEOA === true ;
        
        const isEOA = await this.endPointRetryBlock(requestFtn, 'isEoaAddress');
        addEoaAddressType(address, isEOA, this.networkUid);
        return isEOA;
    }

    async getTransactionList(txFilterList: TransactionFilterList): Promise<TransactionMetaList> {
        
        const requestFtn: RequestFtn<TransactionMeta, TransactionFilter> = async (web3, endPoint, txFilter) => {
            
            let transaction;
            let transactionReceipt;

            if (txFilter.transactionHash !== undefined) {
                transaction = await web3.eth.getTransaction(txFilter.transactionHash);
                transactionReceipt = await web3.eth.getTransactionReceipt(txFilter.transactionHash);
            } else if (txFilter.blockNumber !== undefined && txFilter.transactionIndex !== undefined) {
                transaction = await web3.eth.getTransactionFromBlock(txFilter.blockNumber, txFilter.transactionIndex);
                if (transaction) {
                    transactionReceipt = await web3.eth.getTransactionReceipt(transaction?.hash || '');
                }
            } else {
                const e = new Error(`Error @ [Web3Extended::getTransactionList] invalid transaction filter : ${txFilter}`);
                throw e;
            }

            if (transaction === undefined) {
                throw (`Error @ [Web3Extended::getTransactionList] invalid transaction`);
            }
            if (transactionReceipt === undefined) {
                throw (`Error @ [Web3Extended::getTransactionList] invalid transaction receipt`);
            }

            return { transaction, transactionReceipt };
        }
        
        const list: TransactionMetaList = [];
        for (const txFilter of txFilterList) {
            try {
                const txMeta = await this.endPointRetryBlock(
                    requestFtn,
                    'getTransactionList',
                    true,
                    EndPointProtocol.ETH,
                    txFilter
                );
                if (txMeta.transaction) list.push(txMeta);
            } catch (error) { }
        }

        return list;
    }

    private async getIndexerTransferList<PublicTransferListT>(
        addressList: string[],
        blockRange: { from: number; to: number },
        tokenType: 'Native' | 'ERC',
    ): Promise<PublicTransferListT> {

        const requestFtn: RequestFtn<PublicTransferListT> = async (web3, endPoint) =>
            await fetchIndexerTransferList(web3, endPoint, addressList, blockRange, tokenType) as PublicTransferListT;
        
        return await this.endPointRetryBlock(
            requestFtn,
            `getIndexerTransferList:${tokenType}`,
            false,
            IndexerProtocols
        );
    }

    async getIndexerNativeTransferList(
        addressList: string[],
        blockRange: { from: number; to: number }
    ): Promise<NativePublicTransferList> {
        return this.getIndexerTransferList<NativePublicTransferList>(addressList, blockRange, 'Native');
    }

    async getIndexerERCTokenTransferList(
        addressList: string[],
        blockRange: { from: number; to: number }
    ): Promise<ERCTokenPublicTransferList> {
        return this.getIndexerTransferList<ERCTokenPublicTransferList>(addressList, blockRange, 'ERC');
    }

    async ppendPointRetryBlock<ResultT>(
        requestFtn: RequestFtn<ResultT>,
        requestFtnName : string = '',
        startWithLastUsedRpc : boolean = false,
        protocol: EndPointProtocol[] | EndPointProtocol = EndPointProtocol.ETH,
        data: any = undefined,
    ): Promise<ResultT> {

        const lastUsedEndPointUpdateCallback = (lastUsedEndPoint: EndPoint ) => {
            this.lastUsedEndPoint = lastUsedEndPoint;
        };

        return endPointRetryBlock<ResultT>(
            this,
            this.networkAvgBlkTime,
            this.ethPrimaryEndPointList,
            this.ethEndPointList,
            this.endPointList,
            this.lastUsedEndPoint,
            lastUsedEndPointUpdateCallback,
            requestFtn,
            requestFtnName,
            startWithLastUsedRpc,
            protocol,
            data,
        );
    }

    static override utils = {
        ...Web3.utils,
        genTokenUniqueID,
        isValidAddress
    }

}

function consoleDebug(message?: any, ...optionalParams: any[]): void {
    // console.debug(message, ...optionalParams);
}

function consoleDebugExtra(message?: any, ...optionalParams: any[]): void {
    // console.debug(message, ...optionalParams);
}
