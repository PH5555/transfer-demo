import _ from 'lodash';
import Web3Erc1155 from "./erc-1155";
import Web3Erc20 from "./erc-20";
import Web3Erc721 from "./erc-721";
import {
    EndPointMeta,
    SendContractTransactionResult,
    Token,
    TokenType
} from "./types";
import Web3Extended from "./web3-extended";
import { stringify } from './utils';

export async function getNFTType(
    networkUid: string,
    networkAvgBlkTime: number,
    endpoint: EndPointMeta[],
    contractAddress: string
): Promise<Web3Erc721 | Web3Erc1155 | undefined> {

    try {
        const erc721 = new Web3Erc721(networkUid, networkAvgBlkTime, endpoint, contractAddress);
        if ((await erc721.supportsInterface()) === true) {
            return erc721;
        }
    } catch (error) { }

    try {
        const erc1155 = new Web3Erc1155(networkUid, networkAvgBlkTime, endpoint, contractAddress);
        if ((await erc1155.supportsInterface()) === true) {
            return erc1155;
        }
    } catch (error) { }
}


export async function getErcType(
    networkUid: string,
    networkAvgBlkTime: number,
    endpoint: EndPointMeta[],
    contractAddress: string
): Promise<Web3Erc20 | Web3Erc721 | Web3Erc1155 | undefined> {

    const nft = await getNFTType(networkUid, networkAvgBlkTime, endpoint, contractAddress);
    if (nft !== undefined) {
        return nft;
    }

    try {
        const erc20 = new Web3Erc20(networkUid, networkAvgBlkTime, endpoint, contractAddress);
        const decimals = await erc20.decimals();
        if (decimals >= 0) {
            return erc20;
        }
    } catch (error) { }

}


export async function getErc20TokenMeta(
    networkUid: string,
    networkAvgBlkTime: number,
    endpoint: EndPointMeta[],
    contractAddress: string
): Promise<Token | undefined> {

    const web3 = new Web3Erc20(networkUid, networkAvgBlkTime, endpoint, contractAddress);

    let token: Token = {
        networkUid,
        tokenUid: "",
        tokenType: 'ERC-20',
        isNFT: false,
        contractAddress,
        tokenName: "",
        tokenSymbol: "",
        isNative: false,
        isERC: true,
    };

    try {
        const data = await web3.name();
        if (data) {
            token.tokenName = data
        } else {
            console.warn("getErc20TokenMeta get name error");
            return;
        }
    } catch (error) {
        console.warn("getErc20TokenMeta get name error", error);
        return;
    }

    try {
        const data = await web3.symbol();
        if (data) {
            token.tokenSymbol = data
        } else {
            console.warn("getErc20TokenMeta get symbol error");
            return;
        }
    } catch (error) {
        console.warn("getErc20TokenMeta get symbol error", error);
        return;
    }

    try {

        const data = await web3.decimals();

        if (data) {
            const decimal = parseInt(data.toString());
            if (decimal < 0) {
                console.warn("getErc20TokenMeta invalid decimal ", decimal);
                return;
            }
            token.decimal = decimal;
        } else {
            console.warn("getErc20TokenMeta get decimals error");
            return;
        }

    } catch (error) {
        console.warn("getErc20TokenMeta get decimals error", error);
        return;
    }


    try {
        let token_meta_list = require('../assets/coinGeckoMetaData.json');
        let allTokenInfoURL = '';

        consoleDebug(token_meta_list.length)

        for (const token_meta of token_meta_list) {

            if (
                token_meta.symbol.toLowerCase() === token.tokenSymbol.toLowerCase() &&
                token_meta.name.toLowerCase() === token.tokenName.toLowerCase()
            ) {
                // consoleDebug('Found token info in : coinGeckoMetaData.json ', token_meta);
                allTokenInfoURL = `https://api.coingecko.com/api/v3/coins/${token_meta.id}`;
                break;
            }
        }

        consoleDebug('allTokenInfoURL :', allTokenInfoURL);

        if (allTokenInfoURL.length) {
            const response = await fetch(allTokenInfoURL);
            const txt = await response.text()
            const data = JSON.parse(txt)
            consoleDebug('Token data from CoinGecko:', stringify(data.image, 2));
            token.tokenIconUri = data.image.small;
        }

    } catch (error) {
        console.warn("getErc20TokenMeta get token icon error", error);
    }

    const chain_id = await web3.eth.getChainId();

    const hash = Web3Extended.utils.genTokenUniqueID({
        networkId: chain_id,
        chainId: chain_id,
        contractAddress: contractAddress,
    });

    token.tokenUid = hash.hash;

    consoleDebug(
        '\n=================================================',
        '\nFT Meta : ', endpoint, contractAddress,
        '\n=================================================',
        '\n', stringify(token, 2),
        '\n', stringify(hash, 2),
        '\n=================================================',
        '\n================================================='
    );

    return token;
}


export async function getNFTTokenMeta(
    networkUid: string,
    networkAvgBlkTime: number,
    endpoint: EndPointMeta[],
    contractAddress: string,
    nftType: TokenType | undefined,
    tokenId: bigint | undefined
): Promise<Token | undefined> {

    let token: Token = {
        networkUid,
        tokenUid: "",
        tokenType: 'ERC-721',
        isNative: false,
        isERC: false,
        isNFT: false,
        contractAddress,
        tokenName: "",
        tokenSymbol: "",
        tokenID: tokenId,
    };

    const web3 = nftType === 'ERC-721' ? new Web3Erc721(networkUid, networkAvgBlkTime, endpoint, contractAddress) :
        nftType === 'ERC-1155' ? new Web3Erc1155(networkUid, networkAvgBlkTime, endpoint, contractAddress) :
            await getNFTType(networkUid, networkAvgBlkTime, endpoint, contractAddress);

    if (!web3) return;

    try {
        const data = await web3.name();
        if (data) {
            token.tokenName = data
        } else {
            console.warn("getNFTTokenMeta get name error");
            return;
        }
    } catch (error) {
        console.warn("getNFTTokenMeta get name error", error);
        return;
    }

    try {
        const data = await web3.symbol();
        if (data) {
            token.tokenSymbol = data
        } else {
            console.warn("getNFTTokenMeta get symbol error");
            return;
        }
    } catch (error) {
        console.warn("getNFTTokenMeta get symbol error", error);
        return;
    }

    token.tokenType = web3.getErcType();
    token.isNFT = true;
    token.isERC = true;

    const chain_id = await web3.eth.getChainId();
    let hash;

    if (tokenId !== undefined) {

        let uri: string | undefined = undefined;
        let raceResult: string | undefined = undefined;
        let tokenIconUri: string | undefined = undefined;

        try {
            uri = await web3.getTokenURI(tokenId) as string;
        } catch (e) { }

        consoleDebug('uri :', uri);

        if (uri !== undefined && uri.length) {

            async function fetchMeta(URI: string): Promise<string> {
                const response = await fetch(URI);
                const txt = await response.text()
                return txt;
            }

            try {
                raceResult = await Promise.race([
                    fetchMeta(uri),
                    new Promise<string>((resolve) => setTimeout(() => resolve('RequestTimeout'), 10 * 1000))
                ]);
            } catch (error) { }
        }

        consoleDebug('raceResult :', raceResult);

        if (raceResult !== undefined && raceResult.length > 0 && raceResult !== 'RequestTimeout') {
            try {
                const data = JSON.parse(raceResult)
                consoleDebug('Token image data :', stringify(data, 2));
                tokenIconUri = _.get(data, 'image');
            } catch (error) { }
        }

        if (tokenIconUri !== undefined && tokenIconUri.length) {
            token.tokenIconUri = tokenIconUri;
        }

        hash = Web3Extended.utils.genTokenUniqueID({
            networkId: chain_id,
            chainId: chain_id,
            contractAddress: contractAddress,
            tokenId
        });

    } else {

        hash = Web3Extended.utils.genTokenUniqueID({
            networkId: chain_id,
            chainId: chain_id,
            contractAddress: contractAddress,
        });
    }

    token.tokenUid = hash.hash;

    consoleDebug(
        '\n=================================================',
        '\nNFT Meta : ', endpoint, contractAddress, tokenId,
        '\n=================================================',
        '\n', stringify(token, 2),
        '\n', stringify(hash, 2),
        '\n=================================================',
        '\n================================================='
    );

    return token;
}


export async function getTokenMeta(
    networkUid: string,
    networkAvgBlkTime: number,
    endpoint: EndPointMeta[],
    contractAddress: string,
    tokenId?: bigint | undefined
): Promise<Token | undefined> {

    let web3 = await getErcType(networkUid, networkAvgBlkTime, endpoint, contractAddress);

    if (!web3) return;

    if (web3.getErcType() === TokenType.ERC_20) {
        return getErc20TokenMeta(networkUid, networkAvgBlkTime, endpoint, contractAddress);
    } else if (web3.getErcType() === TokenType.ERC_721 || web3.getErcType() === TokenType.ERC_1155) {
        return getNFTTokenMeta(networkUid, networkAvgBlkTime, endpoint, contractAddress, web3.getErcType(), tokenId);
    } else {
        return;
    }

}


export async function sendErcApproval(
    networkUid: string,
    networkAvgBlkTime: number,
    endpoint: EndPointMeta[],
    token: Token,
    privateKey: string,
    from: string,
    to: string,
    amount: bigint | undefined,
): Promise<SendContractTransactionResult> {

    const { contractAddress, tokenID, tokenType } = token;

    try {

        if (tokenType === TokenType.ERC_20) {
            const web3 = new Web3Erc20(networkUid, networkAvgBlkTime, endpoint, contractAddress);
            return web3.approve({
                from,
                to,
                amount: amount ? amount : 0n,
                privateKey
            });
        } else if ((tokenType === TokenType.ERC_721) && tokenID !== undefined) {
            const web3 = new Web3Erc721(networkUid, networkAvgBlkTime, endpoint, contractAddress);
            return web3.approve({
                from,
                to,
                tokenID,
                privateKey
            });
        } else if ((tokenType === TokenType.ERC_1155) && tokenID !== undefined) {
            const web3 = new Web3Erc1155(networkUid, networkAvgBlkTime, endpoint, contractAddress);
            return web3.setApprovalForAll({
                from,
                to,
                privateKey
            });
        } else {
            const errorMsg = `invalid erc type [${tokenType}] , or invalid tokenId [${tokenID ? tokenID.toString() : undefined}]`
            console.error("Error @ sendErcApprove : " + errorMsg);
            return { error: errorMsg }
        }
    } catch (error) {
        console.error(" Error at sendErcApprove :", error);
        return { error: "sendErcApprove : [" + error + "]" }
    }
}


export async function sendTransfer(
    networkUid: string,
    networkAvgBlkTime: number,
    endpoint: EndPointMeta[],
    token: Token,
    privateKey: string,
    from: string,
    to: string,
    amount: bigint | undefined,
): Promise<SendContractTransactionResult> {

    const { contractAddress, tokenID, tokenType } = token;

    try {

        if (tokenType === TokenType.ERC_20) {
            const web3 = new Web3Erc20(networkUid, networkAvgBlkTime, endpoint, contractAddress);
            return web3.transfer({
                from,
                to,
                amount: amount ? amount : 0n,
                privateKey
            });
        } else if ((tokenType === TokenType.ERC_721) && tokenID !== undefined && tokenID !== null) {
            const web3 = new Web3Erc721(networkUid, networkAvgBlkTime, endpoint, contractAddress);
            return web3.transfer({
                from,
                to,
                tokenID,
                privateKey
            });
        } else if ((tokenType === TokenType.ERC_1155) && tokenID !== undefined && tokenID !== null && amount !== undefined) {
            const web3 = new Web3Erc1155(networkUid, networkAvgBlkTime, endpoint, contractAddress);
            return web3.transfer({
                from,
                to,
                tokenID,
                amount,
                privateKey
            });
        } else {
            console.error(" Error at sendTransfer : invalid erc type =", tokenType);
            return { error: "invalid erc type : " + tokenType }
        }
    } catch (error) {
        console.error(" Error at sendTransfer :", error);
        return { error: "sendTransfer : [" + error + "]" }
    }
}

function consoleDebug(message?: any, ...optionalParams: any[]): void {
    // console.debug(message, ...optionalParams);
}