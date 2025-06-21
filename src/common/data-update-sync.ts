
//
//  Data Update and Synchronization Manager
//

export type ListenerId = string;

export type ListenerCallback<DataType> = ({ key, data }: { key: string, listenerId: ListenerId, data: DataType }) => void;

type Listener<DataType> = {
    key: string,
    listenerId: ListenerId,
    callBack: ListenerCallback<DataType>
};

type KeyMap<DataType> = {
    data: DataType | undefined,
    dataUpdate: DataType | undefined,
    listeners: Map<ListenerId, Listener<DataType>>
};

export class UpdateSyncManager<DataType> {

    private IdGen: bigint;
    private map: Map<string, KeyMap<DataType>>;
    private listenerIdKeyMap: Map<ListenerId, string>;
    private compareData: (prevData: DataType, data: DataType) => boolean;

    constructor(compareData: (prevData: DataType, data: DataType) => boolean) {
        this.IdGen = 1n;
        this.map = new Map();
        this.listenerIdKeyMap = new Map();
        this.compareData = compareData;
    }

    addListerner(
        key: string | undefined | null,
        callBack: ListenerCallback<DataType>
    ): { key: string, listenerId: ListenerId } {

        consoleDebug("addListerner , key =", key);

        const _key = key ? key : (() => {
            this.IdGen = this.IdGen + 1n;
            return this.IdGen.toString(16)
        })();

        this.IdGen = this.IdGen + 1n;
        const listener: Listener<DataType> = {
            key: _key,
            listenerId: this.IdGen.toString(16),
            callBack,
        };

        let map_item = this.map.get(_key);
        if (map_item === undefined) {
            map_item = {
                data: undefined,
                dataUpdate: undefined,
                listeners: new Map()
            }
            this.map.set(_key, map_item);
        }
        map_item.listeners.set(listener.listenerId, listener);

        this.listenerIdKeyMap.set(listener.listenerId, _key);

        setTimeout(() => this.sendUpdate(listener), 0);

        consoleDebug("addListerner , _key =", _key, ", listenerId =", listener.listenerId, " , map.size =", this.map.size, ", listeners.size =", this.listenerIdKeyMap.size);

        return { key: _key, listenerId: listener.listenerId };
    }

    removeListerner(listenerId: ListenerId) {

        consoleDebug("removeListerner , listenerId =", listenerId);

        const key = this.listenerIdKeyMap.get(listenerId);
        this.listenerIdKeyMap.delete(listenerId);

        if (key === undefined) {
            console.warn(`Listener Id [${listenerId}] not found`);
            return;
        }

        let map_item = this.map.get(key);
        if (map_item === undefined) {
            console.warn(`internal error`);
            return;
        }
        map_item.listeners.delete(listenerId);

        consoleDebug("removeListerner , listenerId =", listenerId, ", map.size =", this.map.size, ", listeners.size =", this.listenerIdKeyMap.size);
    }

    updateData(list: { key: string, data: DataType }[]) {

        consoleDebug("updateData , list.size", list.length);

        for (let index = 0; index < list.length; index++) {
            const arg = list[index];

            let map_item = this.map.get(arg.key);
            if (map_item === undefined) {
                map_item = {
                    data: undefined,
                    dataUpdate: undefined,
                    listeners: new Map()
                }
                this.map.set(arg.key, map_item);
            }
            map_item.dataUpdate = arg.data;
        }

        setTimeout(() => this.sendUpdates(), 0);
    }

    private sendUpdate(listener: Listener<DataType>) {
        if (this.listenerIdKeyMap.has(listener.listenerId)) {
            let map_item = this.map.get(listener.key);
            if (map_item && map_item.data) {
                consoleDebug("sendUpdate , key =", listener.key, ", listenerId =", listener.listenerId);
                listener.callBack({ key: listener.key, listenerId: listener.listenerId, data: map_item.data });
            }
        }
    }

    private sendUpdates() {

        let call_backs: {
            key: string,
            listenerId: ListenerId,
            update: DataType,
            callBack: ListenerCallback<DataType>
        }[] = [];

        this.map.forEach(
            (map_item, key) => {
                const prev = map_item.data;
                const update = map_item.dataUpdate;
                const updated = (update) &&
                    (
                        (prev === undefined) ||
                        (prev && this.compareData(prev, update) === false)
                    )

                if (updated) {

                    map_item.listeners.forEach(
                        (listener) => {
                            call_backs.push({
                                key,
                                listenerId: listener.listenerId,
                                update,
                                callBack: listener.callBack
                            })
                        }
                    );

                    map_item.data = map_item.dataUpdate;
                }

            }
        );

        call_backs.forEach(it => {
            try {
                consoleDebug("sendUpdates , key =", it.key, ", listenerId =", it.listenerId);
                it.callBack({ key: it.key, listenerId: it.listenerId, data: it.update })
            } catch (error) {
                console.warn("callBack is failing")
            }
        });
    }
}



function consoleLog(message?: any, ...optionalParams: any[]): void {
    // console.log(message, ...optionalParams);
}

function consoleDebug(message?: any, ...optionalParams: any[]): void {
    // console.debug(message, ...optionalParams);
}