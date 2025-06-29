import { Token } from '../web3/types';
import { INote } from '../azeroth/interfaces';
import { TokenUniqueID } from '../web3';
import { Network, Wallet, ZKTransfer, ZKTransferAmountTy } from '../type/types';

export const AppMajorVersion = '1';
export const AppMinorVersion = '0';
export const AppVersion = AppMajorVersion + '.' + AppMinorVersion;
export const AppBuildCode = '2024' + '10' + '16' + '000';
export const NetworkConfigRemoteURLs = [
    'https://raw.githubusercontent.com/zkrypto-inc/static-assets/main/zk-wallet-networks-enc.json'
];

export const FIGMA_WINDOW_WIDTH = 375;
export const FIGMA_WINDOW_HEIGHT = 812;
export const DESIGN_TAB_HEIGHT = 87;
export const FIGMA_WINDOW_ASPECT_RATIO = FIGMA_WINDOW_WIDTH / FIGMA_WINDOW_HEIGHT;

const BooleanConstants = {
    TRUE: 'TRUE',
    FALSE: 'FALSE',
};



//
// Enums
//

export const SetStatusConstants = {
    Set: 'Set',
    NotSet: 'NotSet',
    Unknown: 'Unknown'
} as const;

export type SetStatus = (typeof SetStatusConstants)[keyof typeof SetStatusConstants];

export enum LocalStoreKeys {
    LOCALE = '@LOCALE',
    ZK_SERVICE_INITIALIZED = '@ZK_SERVICE_INITIALIZED',
    ZK_WALLET_NETWORKS_INITIALIZED = '@ZK_WALLET_NETWORKS_INITIALIZED',
    DEFAULT_ZK_WALLET_NETWORK_ID = '@DEFAULT_ZK_WALLET_NETWORK_ID',
    DEFAULT_USER_ID = '@DEFAULT_USER_ID',
    USED_BIO_AUTH = '@USED_BIO_AUTH',
    ERC20_ICON_URI_PREFIX = '@ERC20_IconUri_',
}

export enum TransferTypes {
    Charge,
    Withdraw,
    Public,
    Private,
}

export enum LogFilterTypes {
    All,
    Send,
    Receive,
    Self,
    FT,
    NFT,
};

export enum AppStates {
    Unknown,
    Entry,
    Welcome,
    WelcomeComplete,
    InitWallet,
    InitWalletComplete,
    AddWallet,
    InitUserLogin,
    InitUserLoginComplete,
    UserLogin,
    UserLoginComplete,
    Home,
    DeleteWallet,
}

export enum TokenCardType {
    NativeCard,
    FTCard,
    ERC721AddressCard,
    ERC1155AddressCard,
    ERC721Card,
    ERC1155Card,
}

export enum PageTaskAndActions {
    None,
    SetDefaultNetwork,
    ChangeDefaultNetwork,
    ShowModalAfterPageLoaded,
    ShowCreateEnaOptions,
    ProcessAppReset,
    ConfirmUserPinForSecretsPage,
    ConfirmUserPinForPinEdit,
    SetNewPin,
    VerifyNewPin,
};

export const ModalTypes = {
    None: 'None',
    Generic: 'Generic',
    EnaAccountCreated: 'EnaAccountCreated',
    InsufficientBalanceForEnaSetup: 'InsufficientBalanceForEnaSetup',
    ContactAdded: 'ContactAdded',
    DeleteFriendConfirm: 'DeleteFriendConfirm',
    CreateEnaFeeInfo: 'CreateEnaFeeInfo',
    CreateEnaComplete: 'CreateEnaComplete',
    CreateEnaInsufficientBalance: 'CreateEnaInsufficientBal',
    RemoveToken: 'RemoveToken',
    CantUseSecreteTransfer: 'CantUseSecreteTransfer',
    AllowCameraPermission: 'AllowCameraPermission',
    InsufficientToTransfer: 'InsufficientToTransfer',
    InsufficientToWithdraw: 'InsufficientToWithdraw',
    InsufficientToReceive: 'InsufficientToReceive',
    NFTSecreteAccountCreated: 'NFTSecreteAccountCreated',
    ReceiveAssetToSecreteAccount: 'ReceiveAssetToSecreteAccount',
    TransferConfirm: 'TransferConfirm',
    MyQrAddress: 'MyQrAddress',
    ViewQRCOde: 'ViewQRCOde',
    ViewNetworkImage: 'ViewNetworkImage',
    WalletDeleteComplete: 'WalletDeleteComplete',
    TransferFailedWithInternalError: 'TransferFailedWithInternalError',
} as const;

export type ModalType = (typeof ModalTypes)[keyof typeof ModalTypes];

export enum PageStates {
    Default,
    Valid,
    Invalid,
}

export enum PageNavHeaders {
    LeftBackArrowIcon,
    RightCloseIcon,
    None,
}


//
// Types
//

export type MnemonicWordTy = {
    id: number;
    word: string;
};

export type InitWalletData = {
    address: string;
    privateKey: string;
    mnemonic?: {
        phrase: string;
        words: MnemonicWordTy[];
        shuffled: MnemonicWordTy[];
    }
}

export type WindowDimension = {
    width: number,
    height: number
};

export type AppWindowParams = {
    screenWindow: WindowDimension,
    safeWindow: WindowDimension,
    horizontalMargin: number,
    isWider: boolean,
    isRoundedIphone: boolean,
    roundedIphoneBottomInsert: number,
    tabBarHeight: number,
};

export const DefaultAppWindowParams: AppWindowParams = {
    screenWindow: { width: FIGMA_WINDOW_WIDTH, height: FIGMA_WINDOW_HEIGHT },
    safeWindow: { width: FIGMA_WINDOW_WIDTH, height: FIGMA_WINDOW_HEIGHT },
    horizontalMargin: 0,
    isWider: false,
    isRoundedIphone: true,
    roundedIphoneBottomInsert: 34,
    tabBarHeight: DESIGN_TAB_HEIGHT,
}

export type ViewDimensions = {
    width: number,
    height: number
    marginTop: number,
    marginBottom: number,
    marginLeft: number,
    marginRight: number,
    paddingTop: number,
    paddingBottom: number,
    paddingLeft: number,
    paddingRight: number,
};

export type AppProfileWalletNetwork = {
    walletAddress: string;
    networkUid: TokenUniqueID;
};

export type AppProfileWalletNetworkModels = {
    wallet: Wallet,
    network: Network
};

export function compareProfile(a: AppProfileWalletNetworkModels | undefined, b: AppProfileWalletNetworkModels | undefined): boolean {
    return (
        ((a ? a.wallet.address.toLowerCase() : '') === (b ? b.wallet.address.toLowerCase() : '')) &&
        ((a ? a.network.uid : '') === (b ? b.network.uid : ''))
    );
}

export type AppProfile<MiscType = any> = {
    secretsDecryptionKey?: string;
    userAuthenticated: SetStatus;
    appWalletNetworkProfile?: AppProfileWalletNetwork;
    initWalletData?: InitWalletData;
    deleteWalletList?: string[];
    networkReachability?: boolean;
    userPin?: string;
    appWindowParams: AppWindowParams;
    logWeb3: boolean;
    web3Logs: string[];
    Misc: MiscType;
};

export type ViewTokenParam = {
    key: string;
    card_type: TokenCardType;
    isPinned: boolean;
    nftContractKey: string,
    nftSubListIndex: number,
    hideTokensInViewList: boolean,
    token: Token,
};

export type ViewHistoryParam = {
    key: string,
    timestamp: Date,
    dateStr: string,
    token: Token
    dbItem: ZKTransfer,
    txTypeDirection: LogFilterTypes,
    amount: bigint,
    uiAmount: string,
    isSpentNote: boolean,
}

export type NameAndAddressData = {
    name: string;
    address: string;
}

export type AddressAndAmountData = {
    address: string;
    amount: bigint;
}

export type UnSpentWalletNoteItem = {
    dbKey: string,
    dbTransfer: ZKTransfer,
    amounts: ZKTransferAmountTy,
    note: INote,
    noteAmt: bigint,
    uiNoteAmt: string,
    noteAddress: string,
    uiNoteAddress: string,
}

export type UnSpentWalletNoteList = UnSpentWalletNoteItem[];

export type TransferAmounts = {
    fromPublicAmount?: bigint;
    fromPrivateAmount?: bigint;
    fromUnSpentNote?: UnSpentWalletNoteItem;
    totalInput: bigint,
    toPublicAmount?: bigint;
    toPrivateAmount?: bigint;
    totalOutput: bigint,
    remainingAmount: bigint;
};

export type InitPinData = {
    userPin: number[],
    useBio: boolean,
}

export type ModalResponseOptions = 'Yes' | 'No' | 'Complete' | 'Cancel' | 'Not Set' | 'Not Supported' | 'Access Denied';

export const Constants = {
    ...BooleanConstants,
    ...SetStatusConstants,
};