import Realm from 'realm';
import { createRealmContext } from '@realm/react';
//
//
import {
    WalletModel,
    ContactModel,
    NetworkModel,
    TokenContractModel,
    NFTModel,
    ZKTransferModel,
    ZkEventCacheModel,
    WNMetaModel,
    WNTokenListModel,
    KeyValueStoreModel,
    WebResourceCacheModel,
    NetworkEndPointModel,
} from './models';
import { dbMigration } from './migration';

const realmConfig: Realm.Configuration = {
    schema: [
        WalletModel,
        ContactModel,
        NetworkModel,
        NetworkEndPointModel,
        TokenContractModel,
        NFTModel,
        ZKTransferModel,
        ZkEventCacheModel,
        WNMetaModel,
        WNTokenListModel,
        KeyValueStoreModel,
        WebResourceCacheModel,
    ],
    schemaVersion: 2,
    onMigration: dbMigration ,
};

export const {
    RealmProvider,
    useRealm,
    useObject,
    useQuery
} = createRealmContext(realmConfig);