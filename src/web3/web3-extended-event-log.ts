import _ from 'lodash';
import {
    ContractAbi,
    Filter,
    EventLog as EthEventLog,
    ContractEvents,
    Contract,
} from 'web3';
import { z } from 'zod';
import { EventLog } from './types';

const EventSchema = z.object({
    address: z.string(),
    blockHash: z.string(),
    transactionHash: z.string(),
    blockNumber: z.bigint(),
    transactionIndex: z.bigint(),
    event: z.string(),
    returnValues: z.any(),
    logIndex: z.bigint().optional(),
});

export async function fetchPastEventLogs<ReturnValuesT = any>(
    eventName: string,
    filterParams: Filter,
    contract: Contract<ContractAbi>,
): Promise<EventLog<ReturnValuesT>[]> {

    let eventRawData: (string | EthEventLog)[];
    try {
        eventRawData = await contract.getPastEvents(
            eventName as keyof ContractEvents<ContractAbi>,
            filterParams 
        );
    } catch (error) {
        throw new Error(`Error fetching events logs : ${error}`);
    }
 
    try {
        const events = eventRawData.map((e) => {
            const eventRaw: EthEventLog = (typeof e === 'string') ? JSON.parse(e) : e;
            const event = EventSchema.parse(eventRaw);
            return event as EventLog<ReturnValuesT>;
        });
        return events;
    } catch (error) {
        throw new Error(`Error parsing events logs : ${error}`);
    }
}
