import types from '../../../common/crypto/deprecated/types';
import { toJson } from '../../../common/utilities';

export default class VerificationKey {
    constructor(ABC, alpha, beta, delta) {
        this.ABC = ABC;
        this.alpha = alpha;
        this.beta = beta;
        this.delta = delta;
    }

    toJson() {
        return toJson(this, null, 2);
    }

    static fromJson(vkJson) {
        let dataJson = JSON.parse(vkJson);
        return new VerificationKey(
            dataJson.ABC,
            dataJson.alpha,
            dataJson.beta,
            dataJson.delta,
        );
    }

    static fromLibrary(rawVk) {
        let vkObj = JSON.parse(rawVk);
        console.log(vkObj.beta, vkObj.delta);
        vkObj.beta = [vkObj.beta[0].reverse(), vkObj.beta[1].reverse()];

        vkObj.delta = [vkObj.delta[0].reverse(), vkObj.delta[1].reverse()];

        return new VerificationKey(
            types.addPrefixHexFromArray(vkObj.ABC),
            types.addPrefixHexFromArray(vkObj.alpha),
            types.addPrefixHexFromArray(vkObj.beta),
            types.addPrefixHexFromArray(vkObj.delta),
        );
    }

    toContractArgs() {
        let args = [this.alpha, this.beta, this.delta, this.ABC];

        return types.addPrefixHexFromArray(args);
    }
}
