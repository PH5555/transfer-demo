import _ from 'lodash';
import { useEffect, useState } from 'react';
import {
    useIsFocused,
    useNavigation as useNavigationBase,
    useRoute
} from '@react-navigation/native';
import {
    AppProfile,
    AppProfileWalletNetworkModels,
    AppWindowParams,
    ModalParameters,
    ModalResponseOptions,
    ModalType,
    ModalTypes
} from './types';
import { Balance } from '../azeroth/types';
import { Token } from '../web3';
import { addBalanceListener, removeBalanceListener } from '../global-states';
import { useSelector } from 'react-redux';
import { useLocalStore } from '../local-storage';
import Azeroth, { NoteProgressNotification } from '../azeroth';
import { ListenerId } from './data-update-sync';

type RouteParamIDs = {
    useRouteParamId: number,
    useRouteResponseId: number,
    useRouteResponseDataId: number,
}

type ResponseCallBacks = {
    onConfirm?: () => void,
    onComplete?: (responseData: any) => void,
    onCancel?: () => void
};

type CallerResponseInfoTy = {
    modalPage: string,
    modalType: ModalType,
    useRouteResponseId: number,
    useRouteResponseDataId: number,
} & ResponseCallBacks;

let routeParams: Map<number, any>;

let routeParamsIDGen: number;

export function initNavigation() {
    if (!routeParams) {
        routeParams = new Map();
        routeParamsIDGen = 1;
    }
}

function setParam(param: any, expectsResponse: boolean = false) {

    const routeParam = {} as RouteParamIDs;

    if (param) {
        routeParamsIDGen = routeParamsIDGen + 1;
        routeParam.useRouteParamId = routeParamsIDGen;
        routeParams.set(routeParam.useRouteParamId, param);
    }

    if (expectsResponse === true) {
        routeParamsIDGen = routeParamsIDGen + 1;
        routeParam.useRouteResponseId = routeParamsIDGen;
        routeParamsIDGen = routeParamsIDGen + 1;
        routeParam.useRouteResponseDataId = routeParamsIDGen;
    }

    return { ...routeParam };
};

function getParam<RouteParamType>(route: any) {

    const useRouteParamId = (route.params && route.params.useRouteParamId) ? route.params.useRouteParamId : undefined
    const param: RouteParamType = (useRouteParamId && routeParams.has(useRouteParamId)) ? routeParams.get(useRouteParamId) : undefined;
    const useRouteResponseId = (route.params && route.params.useRouteResponseId) ? route.params.useRouteResponseId : undefined
    const useRouteResponseDataId = (route.params && route.params.useRouteResponseDataId) ? route.params.useRouteResponseDataId : undefined

    return {
        param,
        useRouteParamId,
        useRouteResponseId,
        useRouteResponseDataId,
    }
};


function goBack<ResponsePayload>(
    navigation: any,
    routeParam: {
        useRouteResponseId: number,
        useRouteResponseDataId: number,
    },
    reponse?: ModalResponseOptions,
    data?: ResponsePayload
) {

    if (reponse) {

        routeParams.set(routeParam.useRouteResponseId, reponse);

        if (data) {
            routeParams.set(routeParam.useRouteResponseDataId, data);
        }
    }

    navigation.goBack();
}


function checkResponse(
    callerResponseInfo: CallerResponseInfoTy,
    setCallerResponseInfo: Function,
) {

    const {
        modalPage,
        modalType,
        useRouteResponseId,
        useRouteResponseDataId,
        onConfirm,
        onComplete,
        onCancel
    } = callerResponseInfo;

    if (routeParams.has(useRouteResponseId)) {

        const response = routeParams.get(useRouteResponseId) as ModalResponseOptions;
        const responseData = routeParams.get(useRouteResponseDataId);

        // console.debug(`clean useRouteResponseId:${useRouteResponseId} , useRouteResponseDataId:${useRouteResponseDataId}`);
        routeParams.delete(useRouteResponseId);
        routeParams.delete(useRouteResponseDataId);

        try {
            // console.debug(`Modal Response : modal=${modalPage}:${modalType} , response=${response} , data=${toJson(responseData, 2)}`);
        } catch (error) { }

        setCallerResponseInfo(undefined);

        try {
            if (response === 'Yes') {
                if (onConfirm) onConfirm();
            } else if (response === 'Complete') {
                if (onComplete) onComplete(responseData);
            } else if (response === 'Cancel' || response === 'No') {
                if (onCancel) onCancel();
            }
        } catch (error) { }

    } else {
        // still waiting 
    }

};


export function useNavigation<RouteParamType>() {

    const navigation: any = useNavigationBase();
    const isFocused = useIsFocused();
    const route = useRoute();
    const [routeParam] = useState(getParam<RouteParamType>(route));
    const [callerResponseInfo, setCallerResponseInfo] = useState<CallerResponseInfoTy>();

    useEffect(() => onLoad(), []);
    useEffect(() => { focusChanged(); }, [isFocused]);

    function navigate<ParamsType>(
        routeName: string,
        params?: ParamsType,
        responseCallback?: ResponseCallBacks,
        navigateType: 'navigate' | 'push' | 'replace' = 'navigate'
    ) {

        const { onConfirm, onComplete, onCancel } = responseCallback ?
            responseCallback :
            { onConfirm: undefined, onComplete: undefined, onCancel: undefined };

        if (!onConfirm && !onComplete && !onCancel) {

            const paramObj = setParam({ ...params, fromNavPageName: route.name })

            // console.debug(`Navigate[${navigateType}] : modalPage=${routeName} , paramObj=${toJson(params, null, 2)}`);

            if (navigateType === 'navigate') {
                navigation.navigate(routeName, paramObj);
            } else if (navigateType === 'push') {
                navigation.push(routeName, paramObj);
            } else if (navigateType === 'replace') {
                navigation.replace(routeName, paramObj);
            }

        } else {

            // expects response

            const paramObj = setParam({ ...params, fromNavPageName: route.name }, true);

            const _params = params as any;
            const modalType = (_params && _params.modalType) ? _params.modalType : ModalTypes.None;

            setCallerResponseInfo({
                modalPage: routeName,
                modalType: modalType,
                onConfirm,
                onComplete,
                onCancel,
                useRouteResponseId: paramObj.useRouteResponseId,
                useRouteResponseDataId: paramObj.useRouteResponseDataId
            });

            // console.debug(`Navigate[${navigateType}]  : modalPage=${routeName} , modalType=${modalType} , paramObj=${toJson(paramObj, null, 2)}`);

            if (navigateType === 'navigate') {
                navigation.navigate(routeName, paramObj);
            } else if (navigateType === 'push') {
                navigation.push(routeName, paramObj);
            } else if (navigateType === 'replace') {
                navigation.replace(routeName, paramObj);
            }
        }

    }

    function replace<ParamsType>(
        routeName: string,
        params?: ParamsType,
        responseCallback?: ResponseCallBacks
    ) {
        navigate(routeName, params, responseCallback, 'replace');
    }

    function push<ParamsType>(
        routeName: string,
        params?: ParamsType,
        responseCallback?: ResponseCallBacks
    ) {
        navigate(routeName, params, responseCallback, 'push');
    }

    function showConfirmModal(
        {
            modalType,
            params,
            onConfirm,
            onComplete,
            onCancel
        }: {
            modalType: ModalType,
            params?: ModalParameters,
        } & ResponseCallBacks
    ) {
        navigate(
            'ConfirmActionModal',
            {
                ...(params ? params : {}),
                modalType
            },
            { onConfirm, onComplete, onCancel }
        );
    };

    function onLoad() {
        return onUnLoad;
    }

    function onUnLoad() {
        if (routeParam.useRouteParamId) {
            // console.debug(`clean useRouteParamId:${routeParam.useRouteParamId}`);
            routeParams.delete(routeParam.useRouteParamId);
        }
    }

    function focusChanged() {
        if (isFocused && callerResponseInfo) {
            checkResponse(callerResponseInfo, setCallerResponseInfo);
        }
    }

    return {
        base: navigation,
        route,
        routeName: route.name,
        routeParam: routeParam ? routeParam.param : undefined,
        navigate, replace, push,
        showConfirmModal,
        goBack: (reponse?: ModalResponseOptions, data?: any) => goBack(navigation, routeParam, reponse, data),
        pop: (num?: number) => navigation.pop(num),
    };
}


export function useBalanceListerner(token?: Token) {

    const [balance, setBalance] = useState<Balance | undefined>(undefined);
    const [listener, setListener] = useState<{
        key: string;
        listenerId: ListenerId;
    } | undefined>(undefined);

    useEffect(() => onLoad(), []);
    useEffect(() => { setListener(onTokenChanged(token)) }, [token]);

    function onLoad() {
        return () => { onUnLoad() };
    }

    function onUnLoad() {
        if (listener !== undefined) removeBalanceListener(listener.listenerId);
    }

    function onTokenChanged(token?: Token) {
        if (listener !== undefined && listener.key !== token?.tokenUid) {
            removeBalanceListener(listener.listenerId);
        }

        return (token !== undefined) ? addBalanceListener(token.tokenUid, ({ data }) => { setBalance(data) }) : undefined;
    }

    return balance;
};


export function useNoteSyncProgressListerner(syncDirection: string) {

    const [progress, setProgress] = useState<NoteProgressNotification | undefined>(undefined);
    const [listenerId, setListenerId] = useState<string | undefined>(undefined);

    useEffect(() => onLoad(), []);

    function onLoad() {
        const rtn = Azeroth.addNoteProgressListener(
            syncDirection,
            ({ data }) => { setProgress(data); }
        );
        setListenerId(rtn.listenerId);
        return () => { onUnLoad() };
    }

    function onUnLoad() {
        if (listenerId) Azeroth.removeNoteProgressListener(listenerId);
    }

    return progress;
};


export function useEnableDebugPress(count: number, clearInterval: number, enableCallBack: () => void) {

    const [pressCount, setPressCount] = useState(0);

    const onPress = () => {
        setPressCount(c => c + 1);
    }

    useEffect(() => {
        if (pressCount >= count) {
            enableCallBack();
            setPressCount(0);
        } else if (pressCount === 1) {
            setTimeout(() => {
                setPressCount(0);
            }, clearInterval * count);
        }

    }, [pressCount]);

    return onPress;
}


export function useAppWindowChange(styleUpdateCallBack: (appWindowParams: AppWindowParams) => void) {
    const { appWindowParams } = useSelector<unknown, AppProfile>((state: any) => state.appProfile);
    useEffect(() => {
        styleUpdateCallBack(appWindowParams);
    }, [appWindowParams]);
}

export function useAppWindowChangeStyle<StyleType>(styleUpdateCallBack: (appWindowParams: AppWindowParams) => StyleType) {
    const { appWindowParams } = useSelector<unknown, AppProfile>((state: any) => state.appProfile);
    const [styles, setStyles] = useState(styleUpdateCallBack(appWindowParams));
    useEffect(() => {
        try {
            const css = styleUpdateCallBack(appWindowParams);
            setStyles(css);
        } catch (error) { }
    }, [appWindowParams]);
    return styles;
}

export function useAppProfile(
    onProfileSetOrChanged?: ((profile: AppProfileWalletNetworkModels) => void) | undefined,
    onProfileCleared?: (() => void) | undefined,
    onProfileChanged?: ((profile?: AppProfileWalletNetworkModels | undefined) => void) | undefined,
) {

    const localStore = useLocalStore();
    const { appWalletNetworkProfile } = useSelector<unknown, AppProfile>((state: any) => state.appProfile);
    const [profile, setProfile] = useState<AppProfileWalletNetworkModels | undefined>(undefined);

    useEffect(() => {
        if (appWalletNetworkProfile === undefined) {
            setProfile(undefined);
        } else {
            const wallet = localStore.getWallet(appWalletNetworkProfile.walletAddress)
            const network = localStore.getNetwork(appWalletNetworkProfile.networkUid)
            if (wallet && network) {
                setProfile({ wallet, network })
            }
        }
    }, [appWalletNetworkProfile]);

    useEffect(() => {
        if (profile !== undefined && onProfileSetOrChanged !== undefined) {
            try { onProfileSetOrChanged(profile) } catch (error) { }
        } else if (profile === undefined && onProfileCleared !== undefined) {
            try { onProfileCleared() } catch (error) { }
        }
        if (onProfileChanged) onProfileChanged(profile);
    }, [profile]);

    return profile;
}
