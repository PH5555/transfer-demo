import ZkryptoCircuit from '../index';
import { toJson } from '../../../common/utilities';

export async function testZkryptoCircuitService() {
    if (ZkryptoCircuit.service.initialized() === false) {
        await ZkryptoCircuit.service.init();
    }

    const inputs = {
        statement: {
            apk: [
                '2ffaa1f153d57be2f3ffa8a2d3273170f3b47a2f7aa58cfdde91d47df623aa1a',
                '869c1246d9577b7b406785c210911e10093bb13f5d054a3c4d41bc9a64dd50d',
            ],
            k_u: [
                '1c4d2e70ef1c6e920223c5ef535ceb0fe6349fb4bc63d6503719e77c58c0adfb',
                '2563be0ad7d22f1f846154f86594759b98d0acbf7095c4cf3907bc6f3f5cfdcb',
            ],
            G_r: [
                'f67c16e4f406d6182745d4e5baac5cb6cc61a0cbfa80166d89ecbf0a334345b',
                '9f0955260cea0b64e9a4a9a72a3fd3dad797993b0190af9462fe1e01f6b81c5',
            ],
            K_u: [
                'a54b2bf01c4b9a4d646c29587fb5f257b12148089dc8c73a5066b172db17a22',
                '15cbd4b518242322fb3cdcf64db11bc7811cf20ac903024d967af49409e13aac',
            ],
            K_a: [
                '279f7e81f70c3275e866235af42e1a2dbde42bd8c941ec3f5563d1c96ef268bd',
                '2211d18bffe778b3cdf7e7bc8b9e1f35e6d54626d21c5bc06304ce5184e6eb0a',
            ],
            cin: ['0', '0', '0', '0'],
            cout: [
                '1bd1cee0809ebc41b04a650f4c6fc5d06d0b70349d22e05c2b46c35a93f42b5f',
                'a50fc88359be251a0deb31e7e2a561ee2da5f07dd2c3177415b04f8bd73c40b',
                '133418ca7956c07929453d5eaf9fb4d4ad68bc5bbb03bd822984c5b855ef0f7d',
                '1820841d3e443a059b1b52b471c929ee3c6892436b50453f4aa617ff777a26f2',
            ],
            CT: [
                '24a5b3eefd1bff68b11f21973e93d52bd5a8f9ef780b8aa4a7940586525f4ec4',
                '64487650808b9ca2f67c67143c7d1e609fda0f19673892d106137ede31ddbc3',
                '4c1e58c3c9d0bba09cf0df1587388c45f250ce56776356c54c1aa14504c11f6',
                '14fca60effc53ea53e256b99320ab0a9c87adcc38900956940e14d62e6440fda',
                '26d1845b618a0b5810eb1cf767dd6828de78c19294483d68e1a42c61fbd47a60',
            ],
            rt: '226ba971fb3415203e784960b0ebb1a7094c2d0e10eacdcf073583c5b5fad5ba',
            sn: '282ee4f8e862280e667b2b1c47dc89fe921d6f2c34da3f123f79449ccc92fa85',
            addr: '2b455dcb142f74a10f77dcdec3ffb618a14b61ad67c3f69270e050975b003e75',
            k_b: 'cf55bf5edfcc4db85e69b9a467fe4cbede54e3283cbe262aa68716fd508335f',
            cm_: '35f7f49195537758e764485245312cc73fb342761a178a4dd830b02fb06e309',
            pv: '0000000000000000000000000000000000000000000000008ac7230489e80000',
            pv_: '0000000000000000000000000000000000000000000000000000000000000000',
            tk_addr_: '0000000000000000000000000000000000000000',
            tk_id_: '0',
        },
        witnesses: {
            k_u_: [
                '1c4d2e70ef1c6e920223c5ef535ceb0fe6349fb4bc63d6503719e77c58c0adfb',
                '2563be0ad7d22f1f846154f86594759b98d0acbf7095c4cf3907bc6f3f5cfdcb',
            ],
            k: [
                '1f628bb4302eff7c99d353ece0d87a765b244e336dce45bb76012441fc5efe97',
                '12310794e77a411ad28d36ca1ff4643aff54fb649038cbcf9d5816a6ddec0934',
            ],
            tree_proof: [
                '0',
                'f140047dfa92d9b77787cfc243ba6da07d8f8aa9301be9bf49042d7f203264a',
                '14bb7f5be26893cddb59c1e471ac8249a1798f79ab8ddb2a2b3d6146e38c324c',
                '19abb411fbbe945405da73a3483b98a64a548a49d992e3fa8697b9c1f6625c1a',
                'efcde44816cbde6cd6ddf56fdffff5730e75345216a57a4a15147737dceee76',
                '8dc58dc35b0ea3db1a6250701674bdf26dd96ab051e0ac1046dc91fc6ab14e1',
                '1afe16a96bf8f4321636f8208342a88761d50287694b901e92cc1f895475bbdc',
                '611e53cf5bba8252bf3865a9f1e60f9c2178a5f3735c84465c0fa80b5ae1fb1',
                '19ee3818f4a5196dd8e33767fbed85d1b89c8059021e2bb92ba45ce1ced601f7',
                '1f37791efe708a0b3cb2cf15fd4015b6b952bc28fc81f94e3af624b692130ab1',
                '77c7e439baf9b532ef317adc8cf3038019e60991d1abf5bd57461199637b5fc',
                '17f6cef430d756ce419204338272ca3ede90a1ac48e5e108afb609eb646a5cd1',
                '2402b171497a731c46b2ae038d14829b5254c1b7bfc3f1cbe13ce580379afc5e',
                '17d3745bc3f612921730e7b4a707ce0c12b79c042af9edaf342a278a82e250ed',
                '1a6475eb32f4d450b77c789b837be1972ab6f25899347de0d7bed43dcc0da1be',
                '7684cf2073e6af343d401ea75afe5c0ea11f30df0c8051c2059a84f1132ea1b',
                '18bd29b44010b0d31c0e037c9c1960dcbaf20bf9105fffd82f5775e3deb55f22',
                '188c70f04f7b9a4551ba1d46fcc858c67ab201a316b41ff2cac792c3a4025a07',
                '2ec65c81126d7d3dd62bef28018b981431db9c4c1b8b11f9db8aafd1a2b2cde9',
                '6671741670ba6e2ebc8b116128b2bd03714dcf427bc1fa6072dc7fa6989a620',
                '2a47dcb0113bfa95369c7dcc5e00bf9481ae3d2af79f49afd4ad0a9086468764',
                '26b204482c1062e21deab21837cbad324bf3665b7703ee3840fa947ac51917ec',
                '20ff9300f8bdbe90bdf94b77b1e6bc70c04c0fa8c09f62b597a67ad2510fa143',
                '72b099f119adacb72806db1b95ae7d265fbd246a824aad5afac027ba54d8ff8',
                '11c4143891b0519d799571bd6c5a9b05e3cacc4d72ecd42945f185d424b02f75',
                '22851f4e5e5cd08929fa3ed1bb16b71f5e9f34b8109909bfc0835fce02f92bfc',
                'bfdc79281a2eb4f8827c4a3242769791160df843134193cfb580028a8838254',
                '10e999defa2e2b6ca3b7b4723a06379ec7aa0dccdf19cd3d731488d59244845a',
                'b2b253c212ebf7261bedb1b30244709bdd94d84d3cb62e41e56e61303d0205a',
                'c64e4c645a01c91b141ea302285a313166e4ebc6285feb407f7b069c4ee1d51',
                '20a6e8e2135e68b770d8ed3254403ad2e959d1c8db35fd5103216cf80e5f0014',
                '22585cd9d15318bfdd921521d8a7f8b2a19f5032c63804dd706b70b8a4a56b7b',
            ],
            sk: '16d440ac88608391cf7035937712ff173b4f28acc297ea10e661bddb2460ac56',
            cm: '0cf31e13539af3584373c4e3967ca0f9c7f4efe85f3cddabaa7ae34596a0033c',
            du: '21865ce44a96b824998f99ff13e43b2ea7542d97a82862dbb8444efdebea9e8c',
            dv: '0000000000000000000000000000000000000000000000000000000000000000',
            tk_addr: '0000000000000000000000000000000000000000',
            tk_id: '0',
            addr_r: '2b455dcb142f74a10f77dcdec3ffb618a14b61ad67c3f69270e050975b003e75',
            k_b_: 'cf55bf5edfcc4db85e69b9a467fe4cbede54e3283cbe262aa68716fd508335f',
            du_: '208cfc3a41a85fc0b8d0bf65223d02b987990568c081f1f581980a88b8b52c38',
            dv_: '0000000000000000000000000000000000000000000000000000000000000000',
            r: '7373a1bd3b1e7e1e3ba78c939e4efdd99cdcae4b05723d243151b6c2f3edad8',
            k_point_x:
                '1f628bb4302eff7c99d353ece0d87a765b244e336dce45bb76012441fc5efe97',
            leaf_pos: '00000000000000000000000000000000',
        },
    };

    console.log('Generating proof...');
    var startTime = Date.now();
    const proof = await ZkryptoCircuit.service.runProof(toJson(inputs));
    console.log('Proof: ', proof); // json format
    console.log('Time elapsed: ', (Date.now() - startTime) / 1000, 's');

    // const proof = {
    //     A: [
    //         '2ff200ad5eff3ed581a5f9934d4e338debae4148224bba9edb2eb2c0e2e346ac',
    //         '203718ee794d91dd1b870432336c08f731bfc28da86ad22439fa5154f4e034bf',
    //     ],
    //     B: [
    //         'ab5a460904c1dc5dc69910482f5edfac2631922beb635fbc0e8166781689734',
    //         'ba8a2e3bc8aefde8b986dd9117e1165688f160e2472274b26025b7c9e41a953',
    //         '10b433308f6f5fb05ca6eba7a69bf700a44b99279a367aa0b44ffdd822c91148',
    //         '2c689cbf2463161457eee48dea616d8a617e486f13bc4606c18e3e2d01b198d',
    //     ],
    //     C: [
    //         '102d4ee7e6e2ac2c637a824ad9b1fa98871187c3555e934dc1d093481eb4c898',
    //         '2423dd8b4823670e1d54fa4db00962998df0a82cd8942f05ae6e3f5b9a7d7582',
    //     ],
    // };

    console.log('Verifying proof...');
    var startTime = Date.now();
    const vf = await ZkryptoCircuit.service.runVerify(
        proof,
        toJson(inputs.statement),
    );
    console.log('Verify:', vf);
    console.log('Time elapsed: ', (Date.now() - startTime) / 1000, 's');
}

export default {
    testZkryptoCircuitService,
};
