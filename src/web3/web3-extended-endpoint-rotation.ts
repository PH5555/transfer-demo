import _ from 'lodash'; 
import {
    EndPointMetric,
    EndPointProtocol,
    EndPointStatus,
    EndPoint,
    RequestFtn,
    IWeb3Extended
} from './types';
import { log } from './web3-extended-log';

export function filterEndPointListByProtocol(
    endPointList: EndPoint[],
    protocol: EndPointProtocol[] | EndPointProtocol
): EndPoint[] {

    if (typeof protocol === 'string') {
        return endPointList.filter(
            endpoint => endpoint.supportedProtocols.includes(protocol)
        );
    } else {
        return endPointList.filter(
            endpoint => {
                let supported = false;
                protocol.forEach(p => {
                    if (endpoint.supportedProtocols.includes(p)) {
                        supported = true;
                    }
                });
                return supported;
            }
        );
    }
}

export function resolveError(
    error: any,
    endPoint: EndPoint,
    requestFtnName: string
) {

    if (error !== undefined) {

        const errorStr = (`${error}`).toLowerCase();

        if (errorStr.includes('syntaxerror')) {
            // possible SyntaxError (broken or not web3 endpoint) use other endpoints
        } else if (errorStr.includes('timeout')) {
            // possible timeout use other endpoints
        } else if (errorStr.includes('rate limit') || errorStr.includes('too many requests')) {
            // try other endpoints
        } else {
            throw error;
        }
    }

}

export async function checkEndPointReachability(endPoint: EndPoint) {

    // TODO : check with pure (fetch) get_chain_id json rpc 
    const isReachable = true;

    if (isReachable) {
        endPoint.skipCount = 0;
        endPoint.status = EndPointStatus.UP;
    } else {
        endPoint.skipCount = endPoint.skipCount + 1;
        endPoint.status = EndPointStatus.DOWN;
    }

    return isReachable;
}

export async function reCheckAllEndPointsReachability(
    endPointList: EndPoint[],
    status: EndPointStatus,
    skipCount: number
) : Promise<void> {

    const reCheckList = endPointList.filter(
        endPoint => (endPoint.status === status && endPoint.skipCount >= skipCount)
    );

    for (let ix = 0; ix < reCheckList.length; ix = ix + 1) {
        const endPoint = reCheckList[ix];
        await checkEndPointReachability(endPoint);
    }
}

export async function selectNextPrimaryEndPoint(
    ethPrimaryEndPointList: EndPoint[],
    endPointList: EndPoint[],
    lastUsedEndPoint: EndPoint | undefined,
    protocol: EndPointProtocol[] | EndPointProtocol,
) : Promise<EndPoint | undefined>{

    let nextEndPoint: EndPoint | undefined = undefined;

    const list = (typeof protocol === 'string' && protocol === EndPointProtocol.ETH)
        ? ethPrimaryEndPointList
        : endPointList.filter(
            endPoint => endPoint.metric <= EndPointMetric.SELF_HOSTED
        );

    if (list.length === 1) {
        nextEndPoint = list[0];
    } else if (list.length > 1) {

        let idx = lastUsedEndPoint
            ? (list.indexOf(lastUsedEndPoint) + 1) % list.length
            : 0;

        for (let i = 0; i < list.length; i = i + 1) {
            nextEndPoint = list[idx];
            if (nextEndPoint.status === EndPointStatus.UP ||
                (await checkEndPointReachability(nextEndPoint)) === true
            ) {
                break;
            }
            nextEndPoint = undefined;
            idx = (idx + 1) % list.length;
        }
    }

    return nextEndPoint;
}

export async function selectNextPublicEndPoint(
    endPointList: EndPoint[],
    lastUsedEndPoint: EndPoint | undefined
): Promise<EndPoint | undefined> {

    let nextEndPoint: EndPoint | undefined = undefined;

    const list = endPointList;

    if (list.length === 1) {
        nextEndPoint = list[0];
    } else if (list.length > 1) {

        let idx = lastUsedEndPoint
            ? (list.indexOf(lastUsedEndPoint) + 1) % list.length
            : 0;

        for (let i = 0; i < list.length; i = i + 1) {
            nextEndPoint = list[idx];
            if (nextEndPoint.status === EndPointStatus.UP) {
                break;
            }
            nextEndPoint = undefined;
            idx = (idx + 1) % list.length;
        }
    }

    return nextEndPoint;
}

export async function selectNextEndPoint(
    ethPrimaryEndPointList: EndPoint[],
    endPointList: EndPoint[],
    lastUsedEndPoint: EndPoint | undefined,
    protocol: EndPointProtocol[] | EndPointProtocol,
): Promise<EndPoint | undefined> {

    let nextPrimary = await selectNextPrimaryEndPoint(
        ethPrimaryEndPointList,
        endPointList,
        lastUsedEndPoint,
        protocol
    );

    if (nextPrimary !== undefined) return nextPrimary;

    let next = await selectNextPublicEndPoint(endPointList, lastUsedEndPoint);

    if (next !== undefined) return next;

    await reCheckAllEndPointsReachability(endPointList, EndPointStatus.DOWN, 5);

    nextPrimary = await selectNextPrimaryEndPoint(
        ethPrimaryEndPointList,
        endPointList,
        lastUsedEndPoint,
        protocol
    );

    if (nextPrimary !== undefined) return nextPrimary;

    next = await selectNextPublicEndPoint(endPointList, lastUsedEndPoint);

    if (next !== undefined) return next;

    return undefined;
}

export async function endPointRetryBlock<ResultT>(
    web3: IWeb3Extended,
    networkAvgBlkTime: number,
    ethPrimaryEndPointList: EndPoint[],
    ethEndPointList: EndPoint[],
    endPointList: EndPoint[],
    lastUsedEndPoint: EndPoint,
    lastUsedEndPointUpdateCallback : (lastUsedEndPoint: EndPoint)=> void,
    requestFtn: RequestFtn<ResultT>,
    requestFtnName = '',
    startWithLastUsedRpc = false,
    protocol: EndPointProtocol[] | EndPointProtocol = EndPointProtocol.ETH,
    data: any = undefined,
): Promise<ResultT> {

    let endPoint: EndPoint | undefined;
    let result: ResultT | undefined = undefined;

    const list = (typeof protocol === 'string' && protocol === EndPointProtocol.ETH)
        ? ethEndPointList
        : filterEndPointListByProtocol(endPointList, protocol);

    const timeout = networkAvgBlkTime * 2;

    endPoint = startWithLastUsedRpc ? lastUsedEndPoint : endPoint;

    // retry loop
    for (let ix = 0; ix < list.length; ix = ix + 1) {

        if (endPoint === undefined) {
            endPoint = await selectNextEndPoint(ethPrimaryEndPointList, list, endPoint, protocol);
        }

        if (endPoint === undefined) {
            throw new Error(`${requestFtnName} : No Endpoints`);
        }

        log(requestFtnName, { UsingEndpoint: `${endPoint.url}` });

        web3.setProvider(endPoint.url);

        try {

            const raceResult = await Promise.race([
                requestFtn(web3, endPoint, data),
                new Promise((resolve) => setTimeout(() => resolve('RequestTimeout'), timeout * 1000))
            ]);

            if (raceResult !== undefined && raceResult !== 'RequestTimeout') {
                result = raceResult as ResultT;
            }

            if (raceResult !== undefined && raceResult === 'RequestTimeout') {
                log('rpcUrlRetryBlock', { Timeout: `${timeout} sec` });
            }

        } catch (error) {
            resolveError(error, endPoint, requestFtnName);
            result = undefined;
        }

        if (result === undefined || result === null) {
            endPoint = undefined;
        } else {
            lastUsedEndPointUpdateCallback(endPoint);
            return result;
        }
    }

    throw new Error(`${requestFtnName} : All end point failed`);
}
