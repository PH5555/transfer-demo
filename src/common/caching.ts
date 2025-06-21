
import { LocalStore, WebResourceCache } from '../local-storage';


export async function cacheWebImageToLocalStore(uri: string, localStorage: LocalStore) {

    try {

        let webData: Omit<WebResourceCache, "uriHash" | "uri"> = {
            base64Data: '',
            mime: ''
        }

        const response = await fetch(uri);
        const imageData = await response.blob();
        webData.base64Data = await blobToBase64(imageData);
        setDataFormat(uri, webData);
        const now = new Date();
        const timestamp = Math.floor(now.getTime() / 1000);
        webData.updateTimestamp = timestamp;
        webData.timeToLeave = timestamp + 1000;

        const webDataDB = localStorage.setResourceCache({ uri }, webData);

        return webDataDB;

    } catch (error: any) {
        console.log({ error });
        return undefined;
    }

}


function setDataFormat(uri: string, webData: Omit<WebResourceCache, "uriHash" | "uri">) {

    if (uri.substring(uri.length - 3).toLowerCase() === "png") {
        webData.base64Data = `data:image/png;base64,${webData.base64Data}`;
        webData.mime = "image/png"
    } else {
        webData.base64Data = `data:image/png;base64,${webData.base64Data}`;
        webData.mime = "image/png"
    }

}


const blobToBase64 = (blob: any): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = reject;
        reader.onload = () => {
            const base64String = reader.result as string;
            resolve(base64String.split(',')[1]);
        };
        reader.readAsDataURL(blob);
    });
};