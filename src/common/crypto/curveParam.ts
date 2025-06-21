
export type ECType = 'EC_ALT_BN128' | 'EC_BLS12_381' | '';

export type CurveParamType = {
    ecType: ECType,
    prime: bigint,
    g: { x: bigint, y: bigint },
    coefA: bigint,
    coefD: bigint,
};

export const CurveParam: CurveParamType = {
    ecType: "",
    prime: 0n,
    g: { x: 0n, y: 0n },
    coefA: 0n,
    coefD: 0n,
};


export function SetupCurveParam(ecType: ECType) {

    if (CurveParam.ecType !== ecType) {

        if (ecType === 'EC_ALT_BN128') {

            CurveParam.prime = BigInt(
                '21888242871839275222246405745257275088548364400416034343698204186575808495617',
            );

            CurveParam.g = {
                x: BigInt(
                    '19698561148652590122159747500897617769866003486955115824547446575314762165298',
                ),
                y: BigInt(
                    '19298250018296453272277890825869354524455968081175474282777126169995084727839',
                ),
            };

            CurveParam.coefA = BigInt('1');

            CurveParam.coefD = BigInt(
                '9706598848417545097372247223557719406784115219466060233080913168975159366771',
            );

        } else if (ecType === 'EC_BLS12_381') {

            CurveParam.prime = BigInt(
                '52435875175126190479447740508185965837690552500527637822603658699938581184513',
            );

            CurveParam.g = {
                x: BigInt(
                    '8076246640662884909881801758704306714034609987455869804520522091855516602923',
                ),
                y: BigInt(
                    '13262374693698910701929044844600465831413122818447359594527400194675274060458',
                ),
            };

            CurveParam.coefA = BigInt(
                '52435875175126190479447740508185965837690552500527637822603658699938581184512',
            );

            CurveParam.coefD = BigInt(
                '19257038036680949359750312669786877991949435402254120286184196891950884077233',
            );
        }

    } else {

        CurveParam.ecType = 'EC_ALT_BN128';

        CurveParam.prime = BigInt(
            '21888242871839275222246405745257275088548364400416034343698204186575808495617',
        );

        CurveParam.g = {
            x: BigInt(
                '995203441582195749578291179787384436505546430278305826713579947235728471134',
            ),
            y: BigInt(
                '5472060717959818805561601436314318772137091100104008585924551046643952123905',
            ),
        };

        CurveParam.coefA = BigInt('168700');

        CurveParam.coefD = BigInt('168696');
    }

    return CurveParam;
}
