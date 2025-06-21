import { Block } from 'web3';
import { TokenUniqueID } from './types';

class SimpleFiFoQueue<ItemType> {

    private items: Map<number, ItemType>;
    private frontIndex: number;
    private backIndex: number;

    constructor() {
        this.items = new Map();
        this.frontIndex = 0
        this.backIndex = 0
    }

    enqueue(item: ItemType) {
        this.items.set(this.backIndex, item);
        this.backIndex++;
        return item;
    }

    dequeue(): ItemType | undefined {
        const item = this.items.get(this.frontIndex);
        if (item) {
            this.items.delete(this.frontIndex);
            this.frontIndex++
            return item
        }
    }

    clear() {
        this.items.clear();
        this.frontIndex = 0
        this.backIndex = 0
    }

    size(): number {
        return this.backIndex - this.frontIndex;
    }
}


//
//  Block Cache
//
let cachedNetworkUid: TokenUniqueID = '-';
let cachedBlocks: Map<number, Block> = new Map();
let cachedBlocksByHash: Map<string, Block> = new Map();
let cachedBlocksOrder: SimpleFiFoQueue<{ blockNumber: number, blockHash: string }> = new SimpleFiFoQueue();

export function getCachedBlock(blockNumberOrHash: string | number, networkUid: TokenUniqueID): Block | undefined {
    
    if (cachedNetworkUid !== networkUid) return undefined;
    
    if (typeof blockNumberOrHash === 'number') {
        return cachedBlocks.get(blockNumberOrHash);
    } else {
        return cachedBlocksByHash.get(blockNumberOrHash);
    }
}

export function addCachedBlock(block: Block, networkUid: TokenUniqueID) {
    
    if (cachedNetworkUid !== networkUid) {
        cachedBlocksByHash.clear();
        cachedBlocksOrder.clear();
        cachedBlocks.clear();
        cachedNetworkUid = networkUid;
    }
    
    const blockNumber = Number(block.number);
    const blockHash = block.hash ? block.hash.toString() : ('0x' + blockNumber.toString(16));
    
    const cachedBlock = cachedBlocks.get(blockNumber);
    
    if (cachedBlock !== undefined) return;

    cachedBlocks.set(blockNumber, block);
    cachedBlocksByHash.set(blockHash, block);
    cachedBlocksOrder.enqueue({ blockNumber, blockHash });
    
    if (cachedBlocksOrder.size() >= 100) {
        const eject = cachedBlocksOrder.dequeue();
        if (eject !== undefined) {
            cachedBlocks.delete(eject.blockNumber);
            cachedBlocksByHash.delete(eject.blockHash);
        }
    }

    return undefined;
}


//
//  EOA Address Cache
//
let eoaAddrCachedNetworkUid: TokenUniqueID = '-';
let eoaAddrCache: Map<string, { isEOA: boolean }> = new Map();
let eoaAddrCacheOrder: SimpleFiFoQueue<string> = new SimpleFiFoQueue();

export function getEoaAddressType(address: string, networkUid: TokenUniqueID): { isEOA: boolean } | undefined {
    
    if (eoaAddrCachedNetworkUid !== networkUid) return undefined;
    
    const cached = eoaAddrCache.get(address);

    if (cached === undefined || cached === null ) {
        return undefined;
    } else {
        return cached ;
    }
}

export function addEoaAddressType(address: string, isEOA: boolean, networkUid: TokenUniqueID) {
    
    if (eoaAddrCachedNetworkUid !== networkUid) {
        eoaAddrCache.clear();
        eoaAddrCacheOrder.clear();
        eoaAddrCachedNetworkUid = networkUid;
    }

    const cached = eoaAddrCache.get(address);
    
    if (cached !== undefined) return;

    eoaAddrCache.set(address, { isEOA });
    eoaAddrCacheOrder.enqueue(address);
    
    if (eoaAddrCacheOrder.size() >= 100) {
        const eject = eoaAddrCacheOrder.dequeue();
        if (eject !== undefined) {
            eoaAddrCache.delete(eject);
        }
    }

    return undefined;
}