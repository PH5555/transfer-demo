import _ from 'lodash';
import Realm, { UpdateMode } from 'realm';
//
//
import { KeyValueStore, KeyValueStoreModel, Models } from './models';
import { KVStoreKeys } from './types';

export function storeData(realm: Realm, key: KVStoreKeys, value: string | undefined) {

    try {
        if (value === undefined) {

            const record = realm.objectForPrimaryKey<KeyValueStore>(Models.KeyValueStore.Name, key);
            if (record) {
                realm.delete(record);
            }

            // console.log(`Remove Item [${key}:${value}] Done...`);

        } else {

            realm.write(
                () => {
                    realm.create<KeyValueStoreModel>(
                        Models.KeyValueStore.Name,
                        {
                            _key: key,
                            _value: value,
                            _valueType: 'string'
                        },
                        UpdateMode.Modified
                    );
                }
            );

            // console.log(`Set Item [${key}:${value}] Done...`);
        }
    } catch (e) {
        console.error(e)
    }
}

export function getData(realm: Realm, key: KVStoreKeys): string | undefined {
    try {
        const record = realm.objectForPrimaryKey<KeyValueStoreModel>(Models.KeyValueStore.Name, key);
        if (record) {
            return record._value;
        } else {
            // console.log(`Get Item [${key}:${undefined}] Done...`);
        }
    } catch (e) {
        console.error(e)
    }
    return undefined;
}