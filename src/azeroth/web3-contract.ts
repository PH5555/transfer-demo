import ABI from './web3-abi';
import { Web3Extended } from '../web3';
import { UPK } from './keys';
import { AffinePoint } from '../common/crypto/curve';
import { ZkEventData, ZkTransferEvent } from './types';
import { toJson, web3NumbersToNumber } from "../common/utilities";
import { PastEventOptions } from "../web3/types";
import { Network } from '../type/types';
import ZkWalletBase from "./ZkWalletBase.json";
import Web3 from 'web3';

export default class Web3Azeroth extends Web3Extended {
    public smartContract: any;

    constructor(network: Network, privateKey: any) {
        super({
            networkUid: network.uid,
            endPointList: network.endPointList.map(e => e),
            networkAvgBlkTime: network.averageBlockTime,
            contract: {
                contractAddress: network.azerothContractAddress,
                abi: ABI.Azeroth
            }
        });

        const web3 = new Web3('http://127.0.0.1:8545');
        const account = web3.eth.accounts.privateKeyToAccount(privateKey);
        web3.eth.accounts.wallet.add(account);
        const contractABI = ZkWalletBase.abi;
        const contractAddress = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512';
        this.smartContract = new web3.eth.Contract(contractABI, contractAddress);
    }

    async getZkTransferEvents(filterParams: PastEventOptions): Promise<ZkTransferEvent[]> {

        const events = (await this.getPastEventLogs('LogZkTransfer', filterParams)).eventLogs || [];
        consoleLog("getZkTransferEvents : events.length =", events.length)
 
        const result = events.map(
            (event) => ({
                blockNumber: event.blockNumber ? web3NumbersToNumber(event.blockNumber) : 0,
                transactionHash: event.transactionHash as string,
                transactionIndex: event.transactionIndex ? web3NumbersToNumber(event.transactionIndex) : 0,
                eventData: new ZkEventData(event.returnValues),
            }));

        return result;
    }

    curvePointToMethodParams(curve: AffinePoint) {
        return [
            curve.toHexArray(),
        ];
    }

    methodParamsToCurvePoint(rawData: any): AffinePoint {
        return new AffinePoint(BigInt(rawData[0].x), BigInt(rawData[0].y))
    }

    async getAPK() {
        try {
            const rawData = await this.smartContract.methods.getAPK().call();
            return this.methodParamsToCurvePoint(rawData);
        } catch (error) {
            console.error("Error @ Web3Azeroth::getAPK :", error);
            return new AffinePoint(0n, 0n);
        }
    }

    async getZkTransferFee() {
        try {
            const fee_str: any = await this.smartContract.methods.getZkTransferFee().call();
            const fee = BigInt(fee_str.toString());
            return fee
        } catch (error) {
            console.error("Error @ Web3Azeroth::getZkTransferFee :", error);
            return 0n;
        }
    }

    userPubKeyToMethodParams(userPk: UPK) {
        return [
            userPk.ena,
            userPk.pkOwn,
            userPk.pkEnc.toHexArray(),
        ];
    }

    methodParamsToUserPubKey(rawData: any): UPK {
        return new UPK({
            ena: BigInt(rawData[0]),
            pkOwn: BigInt(rawData[1]),
            pkEnc: new AffinePoint(BigInt(rawData[2][0]), BigInt(rawData[2][1]))
        })
    }

    async getUserPublicKeys(address: string): Promise<UPK | undefined> {
        try {
            const rawData: any = await this.smartContract.methods.getUserPublicKeys(address).call();
            return this.methodParamsToUserPubKey(rawData);
        } catch (error) {
            console.warn("Error @ Web3Azeroth::getUserPublicKeys :", error);
            return undefined;
        }
    }

    async setUserPublicKeys(
        {
            
            userPubKey,
            userEthAddress,
            userEthPrivateKey,
            estimateGasFeeOnly,
        }: {
            userPubKey: UPK,
            userEthAddress: string,
            userEthPrivateKey: string | null,
            estimateGasFeeOnly: boolean,
        }
    ) {
        return await this.sendContractTransaction({
            methodName: "registerUser",
            methodArgs: this.userPubKeyToMethodParams(userPubKey),
            senderEthAddr: userEthAddress,
            senderEthPrivateKey: userEthPrivateKey,
            estimateGasFeeOnly
        });
    }

    async isSpentNote(nf: bigint): Promise<boolean> {
        const result: any = await this.smartContract.methods.isNullified(nf).call();
        return result === true;
    }

    async getEnaLength(ena: bigint) {
        const length: any = await this.smartContract.methods.getEnaLength(ena).call() as bigint;
        try {
            return web3NumbersToNumber(length);
        } catch (error) {
            
        }
    }

    async getCiphertext(ena: bigint, index: number) {
        const rawsCT: any = await this.smartContract.methods.getCiphertext(ena, index).call();
        return rawsCT;
    }

    async getRootTop() {
        const rawRoot: any = await this.smartContract.methods.getRootTop().call();
        return BigInt(rawRoot);
    }

    async getMerklePath(index: bigint) {
        const rawPathArray: any = await this.smartContract.methods.getMerklePath(index).call();
        const pathArray = (rawPathArray as string[]).map(bigintStr => BigInt(bigintStr));
        return pathArray;
    }

    async zkTransfer20(
        methodArgs: (string | bigint | bigint[])[],
        userEthAddress: string,
        value: bigint,
        senderEthPrivateKey: string,
        estimateGasFeeOnly: boolean,
    ) {
        return this.sendContractTransaction({
            methodName: 'zkTransfer20',
            methodArgs: methodArgs,
            senderEthAddr: userEthAddress,
            senderEthPrivateKey: senderEthPrivateKey,
            value: value,
            estimateGasFeeOnly: estimateGasFeeOnly,
            fetchBlock: true,
        });
    }

    async zkTransfer721(
        methodArgs: (string | bigint | bigint[])[],
        userEthAddress: string,
        value: bigint,
        senderEthPrivateKey: string,
        estimateGasFeeOnly: boolean,
    ) {
        return this.sendContractTransaction({
            methodName: 'zkTransfer721',
            methodArgs: methodArgs,
            senderEthAddr: userEthAddress,
            senderEthPrivateKey: senderEthPrivateKey,
            value: value,
            estimateGasFeeOnly: estimateGasFeeOnly,
            fetchBlock: true,
        });
    }

    async zkTransfer1155(
        methodArgs: (string | bigint | bigint[])[],
        userEthAddress: string,
        value: bigint,
        senderEthPrivateKey: string,
        estimateGasFeeOnly: boolean,
    ) {
        return this.sendContractTransaction({
            methodName: 'zkTransfer1155',
            methodArgs: methodArgs,
            senderEthAddr: userEthAddress,
            senderEthPrivateKey: senderEthPrivateKey,
            value: value,
            estimateGasFeeOnly: estimateGasFeeOnly,
            fetchBlock: true,
        });
    }

}

function consoleLog(message?: any, ...optionalParams: any[]): void {
    // console.log(message, ...optionalParams);
}

function consoleDebug(message?: any, ...optionalParams: any[]): void {
    // console.debug(message, ...optionalParams);
}

function consoleDebugExtra(message?: any, ...optionalParams: any[]): void {
    // console.debug(message, ...optionalParams);
}