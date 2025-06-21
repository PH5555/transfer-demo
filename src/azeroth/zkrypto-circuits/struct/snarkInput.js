import types from '../../../common/crypto/deprecated/types';
import { toJson } from '../../../common/utilities';

export default class SnarkInput {
    /**
     *
     * @param {Object}                  keys            The object of keys { auditor.pk, sender.sk, sender.pk, receiver.pk }
     * @param {Object}                  ciphertexts     The object of ciphertext { oldsCT, newsCT, newpCT }
     * @param {Object}                  merkleTreeData  The object of merkleTreeData { root, intermediateHashes, index }. Refer - src/services/client/merkleTreeData
     * @param {Object}                  nullifier       The nullifier, hexadecimal string
     * @param {Object}                  commitments     The object of commitments { oldCm, newCm }
     * @param {Object}                  opens           The object of openings { oldOpen, newOpen }
     * @param {Object}                  balance         The object of some balance type { pocket, oldCmBal }
     * @param {Object}                  aux             The object of auxiliary data related with encryption scheme  {  newR, newK }
     */
    constructor(
        keys,
        ciphertexts,
        merkleTreeData,
        nullifier,
        commitments,
        opens,
        balance,
        aux,
        tokenInfo,
    ) {
        this.keys = keys;
        this.ciphertexts = ciphertexts;
        this.merkleTreeData = merkleTreeData;
        this.nullifier = nullifier;
        this.commitments = commitments;
        this.opens = opens;
        this.balance = balance;
        this.aux = aux;
        this.tokenInfo = tokenInfo;
    }

    toJson() {
        return toJson(this, 2);
    }

    toSnarkInputFormat() {
        const input = {
            statement: {
                apk: [
                    this.keys.auditor.pk.x.toString(16),
                    this.keys.auditor.pk.y.toString(16),
                ],
                k_u: [
                    this.keys.sender.pk.pkEnc.x.toString(16),
                    this.keys.sender.pk.pkEnc.y.toString(16),
                ],
                G_r: [
                    this.ciphertexts.newpCT.c0.x.toString(16),
                    this.ciphertexts.newpCT.c0.y.toString(16),
                ],
                K_u: [
                    this.ciphertexts.newpCT.c1.x.toString(16),
                    this.ciphertexts.newpCT.c1.y.toString(16),
                ],
                K_a: [
                    this.ciphertexts.newpCT.c2.x.toString(16),
                    this.ciphertexts.newpCT.c2.y.toString(16),
                ],
                cin: [
                    this.ciphertexts.oldsCT.r,
                    this.ciphertexts.oldsCT.ct[0],
                    this.ciphertexts.oldsCT.ct[1],
                    this.ciphertexts.oldsCT.ct[2],
                ],
                cout: [
                    this.ciphertexts.newsCT.r,
                    this.ciphertexts.newsCT.ct[0],
                    this.ciphertexts.newsCT.ct[1],
                    this.ciphertexts.newsCT.ct[2],
                ],
                CT: [
                    this.ciphertexts.newpCT.c3[0],
                    this.ciphertexts.newpCT.c3[1],
                    this.ciphertexts.newpCT.c3[2],
                    this.ciphertexts.newpCT.c3[3],
                    this.ciphertexts.newpCT.c3[4],
                ],
                rt: this.merkleTreeData.root,
                sn: this.nullifier,
                addr: this.keys.sender.pk.ena,
                k_b: this.keys.sender.pk.pkOwn,
                cm_: this.commitments.newCm,
                pv: types.padZeroHexString(this.balance.pocket.pubInBal),
                pv_: types.padZeroHexString(this.balance.pocket.pubOutBal),
                tk_addr_: this.tokenInfo.tk_addr_,
                tk_id_: this.tokenInfo.tk_id_,
            },
            witnesses: {
                k_u_: [
                    this.keys.receiver.pk.pkEnc.x.toString(16),
                    this.keys.receiver.pk.pkEnc.y.toString(16),
                ],
                k: [this.aux.newK.x.toString(16), this.aux.newK.y.toString(16)],
                tree_proof: this.merkleTreeData.toIntermediateHashesArray(),
                sk: types.padZeroHexString(this.keys.sender.sk),
                cm: types.padZeroHexString(this.commitments.oldCm),
                du: types.padZeroHexString(this.opens.oldOpen),
                dv: types.padZeroHexString(this.balance.oldCmBal),
                tk_addr: this.tokenInfo.tk_addr,
                tk_id: this.tokenInfo.tk_id,
                addr_r: this.keys.receiver.pk.ena,
                k_b_: this.keys.receiver.pk.pkOwn,
                du_: this.opens.newOpen,
                dv_: types.padZeroHexString(this.balance.pocket.privBal),
                r: this.aux.newR,
                k_point_x: this.aux.newK.x.toString(16),
                leaf_pos: this.merkleTreeData.direction,
            },
        };
        return toJson(input);
    }

    static fromJson(libsnarkInputJson) {
        let dataJson = JSON.parse(libsnarkInputJson);
        return new SnarkInput(
            dataJson.keys,
            dataJson.ciphertexts,
            dataJson.merkleTreeData,
            dataJson.nullifier,
            dataJson.commitments,
            dataJson.opens,
            dataJson.balance,
            dataJson.aux,
        );
    }
}

/**
 * The test input format
 */
// const inputs = {
//     statement: {
//         apk: [
//             '2ffaa1f153d57be2f3ffa8a2d3273170f3b47a2f7aa58cfdde91d47df623aa1a',
//             '869c1246d9577b7b406785c210911e10093bb13f5d054a3c4d41bc9a64dd50d',
//         ],
//         k_u: [
//             '184a89d4f2c96852641bf30769651612e800e22c60f736af248bed0d1507d8d8',
//             '17a3dfe78fbf56ba962f6ab2e771a053182dbac668b9a74bded3c9ca8e0b4cf5',
//         ],
//         G_r: [
//             '2e51328ccb80899d2f2ac5e67c7754f65fc061f091fb1db286000c8d0d3b576a',
//             '189557ff0057358555fe656b164c367eef3b3e81a0115a53352ba18dee81bbe5',
//         ],
//         K_u: [
//             '27d63a2d57d7662013985ad1cc4c94b3803631adc93063a40b9bd8f9620b3e84',
//             '2734083e82b6f3af32d63956c79d51140160d1ffc55464230e4138f3bd163cfc',
//         ],
//         K_a: [
//             '24c63407c4c4032be46f596693ac4bc07031f0d40cab48f539e0cca7740eebd1',
//             '5f71cacadd9bbc5442274a6532f91fe8172a5a09b2698f27c1d49eafd439c0e',
//         ],
//         cin: [
//             'd004a3ec16148a06e4327024d35da4596668851b471e9e85623ab712940117e',
//             '2c5e49c1f50f94eda6e26b9c4f4a8dcc4f9977ca724ff05da0cc3aa97f45f6b4',
//             '2dbd2ac4b0afa023575c4ab5f359be391da20d3343355cd7a7fb6ff3c0df1327',
//             '2bdf2bb3a848c21cf777e40f11a81b6c9aba8eec868e421d3f837eed4b671d04',
//         ],
//         cout: [
//             'd004a3ec16148a06e4327024d35da4596668851b471e9e85623ab712940117e',
//             '2c5e49c1f50f94eda6e26b9c4f4a8dcc4f9977ca724ff05da0cc3aa97f45f6b4',
//             '2dbd2ac4b0afa023575c4ab5f359be391da20d3343355cd7a7fb6ff3c0df1327',
//             '2bdf2bb3a848c21cf777e40f11a81b6c9aba8eec868e421d3f837eed4b671d04',
//         ],
//         CT: [
//             '16301baa62280fb5f7388496a135234fc987f790ea3b76ad15be44411928b20b',
//             '1aa7215c44a4fb56a2753bf4a621811bf0dbb686fe04cb470ef71748a0f078a8',
//             '26638199aedb665665b6e5510bc875c9bde16b4d11d890131d3ea840ff0ca1d6',
//             'c9f5b113aa08102e7ea7be307bb1ff4d9445b114df1463440602f1eb236d41b',
//             '25585cabd7222743ddfc21e0149e44ad1cc0b16c19dfdacfe50db16a6174d308',
//         ],
//         rt: 'ee5ad68e7a79145f3943a1bd7dc3df52a8658a020d2d8e4dc358a5783fa296f',
//         sn: 'ba30ee37ef5355de4ad700218656797264007999177d64e89e9fa88766613df',
//         addr: '2280bb026ecedaecbe33b929d337728238d4ff68b1e12f751e013623597e3fc7',
//         k_b: '25879229d85d0f84d0eeb54040a54e8c4b1e3c70b8410a198a2d58d0bbc46adf',
//         cm_: '1fe941d80d5077c04e4cfee0e787a2cdd060b1834bbe943ad965d7f75ad2b3cf',
//         pv: '1',
//         pv_: '1',
//         tk_addr_: '1',
//         tk_id_: '1',
//     },
//     witnesses: {
//         k_u_: [
//             '101ffb53768dbe1260bf8809c7c4e4173454f31f6fc73b180ed67567aea77647',
//             '14ed3d1e7e10584cbc70f4055ac907b4e82460223b5869545f0098d4609a741c',
//         ],
//         k: [
//             '25d0e1b0ad610dec76e71a415a71f3097fb6df1acc8cfd5ecd769a0fee11ee2f',
//             '12a5635954121d4e2dbc98363537f7c1eb0c5f817dcdcc0aa8bf45020ac2d66c',
//         ],
//         tree_proof: [
//             'f140047dfa92d9b77787cfc243ba6da07d8f8aa9301be9bf49042d7f203264a',
//             '7684cf2073e6af343d401ea75afe5c0ea11f30df0c8051c2059a84f1132ea1b',
//             '1a6475eb32f4d450b77c789b837be1972ab6f25899347de0d7bed43dcc0da1be',
//             '17d3745bc3f612921730e7b4a707ce0c12b79c042af9edaf342a278a82e250ed',
//             '2402b171497a731c46b2ae038d14829b5254c1b7bfc3f1cbe13ce580379afc5e',
//             '17f6cef430d756ce419204338272ca3ede90a1ac48e5e108afb609eb646a5cd1',
//             '77c7e439baf9b532ef317adc8cf3038019e60991d1abf5bd57461199637b5fc',
//             '1f37791efe708a0b3cb2cf15fd4015b6b952bc28fc81f94e3af624b692130ab1',
//             '19ee3818f4a5196dd8e33767fbed85d1b89c8059021e2bb92ba45ce1ced601f7',
//             '611e53cf5bba8252bf3865a9f1e60f9c2178a5f3735c84465c0fa80b5ae1fb1',
//             '1afe16a96bf8f4321636f8208342a88761d50287694b901e92cc1f895475bbdc',
//             '8dc58dc35b0ea3db1a6250701674bdf26dd96ab051e0ac1046dc91fc6ab14e1',
//             'efcde44816cbde6cd6ddf56fdffff5730e75345216a57a4a15147737dceee76',
//             '19abb411fbbe945405da73a3483b98a64a548a49d992e3fa8697b9c1f6625c1a',
//             '14bb7f5be26893cddb59c1e471ac8249a1798f79ab8ddb2a2b3d6146e38c324c',
//         ],
//         sk: '2dcf45f84ea32723c456a183c827db2be4fbf1e26c526ffecb3dc598161280e5',
//         cm: '6fc4aa6d3406fe8403eb719845597fc86dd3e3fcee7093afece895f13b6a5e5',
//         du: '2b4071f82668a479716eb6717d3b74e07a03247ab81e21357d0a4de3acf6cf6c',
//         dv: '1',
//         tk_addr: '1',
//         tk_id: '1',
//         addr_r: '29c6a42ae3e93b0e1cdae3fba8b267bd52cc801412c3e93e5ed1742ed5368561',
//         k_b_: '38812cee89d8c40aea63a43ea8810a0bafe1f402408fd8f5e9ad64e6efbdcd2',
//         du_: '70991ea188ab99fa0e8cedfd13a1c0028bd926385029ef7beadb8e411026de',
//         dv_: '1',
//         r: '18047130ae9455c10670288f4509b05d373aba709dfefa3c8dae460cad028ac',
//         k_point_x:
//             '25d0e1b0ad610dec76e71a415a71f3097fb6df1acc8cfd5ecd769a0fee11ee2f',
//         leaf_pos: '0',
//     },
// };
