import _ from 'lodash';
import Web3 from 'web3';
import { GasEstimation } from './types'; 
import { stringify } from './utils';

let logCallBack: ((log: string) => void) | undefined = undefined;

export function SetLogCallBack(callBack: (log: string) => void) {
    logCallBack = callBack;
}
export function ClearLogCallBack() {
    logCallBack = undefined;
}

export function logMethodParam(ftnName: string, methodName: string, param: any) {
    log(ftnName, { MethodName: methodName, Params: param });
}

export function log(ftnName: string, logObj: any): void {
    consoleDebug(`Web3Log:${ftnName},${stringify(logObj, 2)}`);
    if (logCallBack) {
        logCallBack(`Web3Log::${ftnName},\n${stringify(logObj, 2)}`);
    }
}

export function logError(ftnName: string, errorLogObj: any): void {
    consoleDebug(`Web3ErrorLog:${ftnName},${stringify(errorLogObj, 2)}`);
    if (logCallBack) {
        logCallBack(`Web3ErrorLog::${ftnName},\n${stringify(errorLogObj, 2)}`);
    }
}

export function consoleLogGasEstimation(gasEstimation?: GasEstimation) {
    return (gasEstimation) ?
        `
GasEstimation :
${gasEstimation.possibleOverShot ? "Possible insufficient balance for gas payment" : "Sufficient balance for gas payment"} 
gasEstimate = ${gasEstimation.gasEstimate.toString(10)} 
gasPrice    = ${gasEstimation.gasPrice.toString(10)}  
gasFee      = ${gasEstimation.gasFee.toString(10)}  
value       = ${gasEstimation.value.toString(10)} 
txCost      = ${gasEstimation.txCost.toString(10)} 
balance     = ${gasEstimation.senderBalance.toString(10)} 
overshot    = ${Web3.utils.fromWei(gasEstimation.overShotBy.toString(10), 'ether')} [ ${gasEstimation.overShotBy.toString(10)} ] 
`
        : 'GasEstimation : undefined';
}

function consoleDebug(message?: any, ...optionalParams: any[]): void {
    // console.debug(message, ...optionalParams);
}

function consoleDebugExtra(message?: any, ...optionalParams: any[]): void {
    // console.debug(message, ...optionalParams);
}
