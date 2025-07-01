import './App.css';
import { ethers } from 'ethers';
import { useState } from 'react';
import { Network, Token, TokenType, TransferAmounts, Wallet } from './type/types';
import { tranfer } from './azeroth/transfer';
import { UserKey } from './azeroth/keys';
import { AffinePoint } from './common/crypto/curve';
import Web3Azeroth from './azeroth/web3-contract';

function App() {
  const [senderAddress, setSenderAddress] = useState('');
  const [senderKey, setSenderKey] = useState('');
  const [receiverAddress, setReceiverAddress] = useState('');
  const [balanceAddress, setBalanceAddress] = useState('');
  const [amounts, setAmounts] = useState<TransferAmounts>(initAmounts());
  const [zktransferData, setZktransferData] = useState({
    senderAddress: '',
    senderKey: '',
    receiverAddress: '',
    ena : '',
    pkOwn : '',
    x : '',
    y : '',
    sk : '',
  });

  const hardhatNetwork: Network = {
    uid: 'hardhat-eth-31337',
    networkId: 31337,
    chainId: 31337,
    networkName: 'Hardhat Local',
    nativeSymbol: 'ETH',
    decimal: 18,
    networkIconUri: '',
    networkIconCache: '',
    azerothContractAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
    azerothContractBlk: 0,
    averageBlockTime: 1,
    isTestNet: true,
    latestZkEventBlkNum: undefined,
    earliestZkEventBlkNum: undefined,
    startZkEventBlkNum: undefined,
    latestZkTransferFeeHex: '0x0',
    endPointList: [
      {
        url: 'http://localhost:8545',
        supportedProtocols: ['http'],
        metric: 1,
      },
    ] as any,
    masked: false,
  };

  const ethNativeToken: Token = {
    networkUid: 'hardhat-eth-31337',
    tokenUid: 'hardhat-eth-31337-native',
    tokenType: TokenType.NATIVE,
    isNative: true,
    isERC: false,
    isNFT: false,
    contractAddress: '',
    tokenName: 'Ethereum',
    tokenSymbol: 'ETH',
    decimal: 18,
  };

  function initAmounts(): TransferAmounts {
    return {
        fromPublicAmount: 0n,
        fromPrivateAmount: 0n,
        fromUnSpentNote: undefined,
        totalInput: 0n,

        toPublicAmount: 0n,
        toPrivateAmount: 0n,
        totalOutput: 0n,

        remainingAmount: 0n,
    }
  }

  const getUserkey = () => {
    const web3Azeroth = new Web3Azeroth(hardhatNetwork, senderKey);
    web3Azeroth.getUserPublicKeys(receiverAddress);
  }

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setAmounts(prev => {
      const parsed = value === '' ? undefined : BigInt(value);

      const new_amount = {
        ...prev,
        [name]: parsed,
      };
      setAutoAmounts(new_amount);
      return new_amount;
    });
  };

  const handleZktransferDataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setZktransferData(prev => {
      const new_amount = {
        ...prev,
        [name]: value,
      };
      return new_amount;
    });
  };

  function setAutoAmounts(amount: TransferAmounts) {
      amount.totalInput =
          (amount.fromPublicAmount ? amount.fromPublicAmount : 0n) +
          (amount.fromPrivateAmount ? amount.fromPrivateAmount : 0n) +
          (amount.fromUnSpentNote ? amount.fromUnSpentNote.noteAmt : 0n);

      amount.totalOutput =
          (amount.toPublicAmount ? amount.toPublicAmount : 0n) +
          (amount.toPrivateAmount ? amount.toPrivateAmount : 0n);

      amount.remainingAmount = amount.totalInput - amount.totalOutput;
  }

  const zktransfer = async() => {
    const wallet: Wallet = {
      address: zktransferData.senderAddress,
      name: '',
      enaHex: zktransferData.ena,
      pkOwn: zktransferData.pkOwn,
      pkEncJson: '',
      masked: false,
      placeholderIconIndex: 0,
    }
    tranfer({
        ethPrivateKey: senderKey,
        userKey: new UserKey({ena: BigInt(zktransferData.ena), pkOwn: BigInt(zktransferData.pkOwn), pkEnc: new AffinePoint(BigInt(zktransferData.x), BigInt(zktransferData.y)), sk: BigInt(zktransferData.sk)}),
        network: hardhatNetwork as Network,
        wallet,
        token: ethNativeToken as Token,
        amounts: amounts,
        receiverAddr: receiverAddress,
        zkTxFee: hardhatNetwork.latestZkTransferFeeHex ? BigInt(hardhatNetwork.latestZkTransferFeeHex) : 0n,
        advanceProgress: () => {},
        onFail: () => {}
    });
  }

  const transfer = async() => {
    const provider = new ethers.JsonRpcProvider("http://localhost:8545");
    const wallet = new ethers.Wallet(senderKey, provider);

    await wallet.sendTransaction({
      to: receiverAddress,
      value: ethers.parseEther("10.0")
    });

    alert("완료");
  }

  const getBalance = async() => {
    const provider = new ethers.JsonRpcProvider("http://localhost:8545");
    console.log(await provider.getBalance(balanceAddress));
  }

  return (
    <div className="App">
      <div>
        <h2>이더리움 전송</h2>
        <div>보내는 사람 주소</div>
        <input value={senderAddress} onChange={e => setSenderAddress(e.target.value)}/>
        <div>보내는 사람 키</div>
        <input value={senderKey} onChange={e => setSenderKey(e.target.value)}/>
        <div>받는 사람 주소</div>
        <input value={receiverAddress} onChange={e => setReceiverAddress(e.target.value)}/>
        <br/>
        <input type='button' value={"전송"} onClick={getUserkey}/>

        <h2>잔액 확인</h2>
        <div>주소</div>
        <input value={balanceAddress} onChange={e => setBalanceAddress(e.target.value)}/>
        <input type='button' value={"확인"} onClick={getBalance}/>
      </div>

      <div>
        <h2>zktransfer</h2>
        <div>보내는 사람 주소</div>
        <input name='senderAddress' value={zktransferData.senderAddress} onChange={handleZktransferDataChange}/>
        <div>보내는 사람 키</div>
        <input name='senderKey' value={zktransferData.senderKey} onChange={handleZktransferDataChange}/>
        <div>보내는 사람 ena</div>
        <input name='ena' value={zktransferData.ena} onChange={handleZktransferDataChange}/>
        <div>보내는 사람 pkown</div>
        <input name='pkOwn' value={zktransferData.pkOwn} onChange={handleZktransferDataChange}/>
        <div>보내는 사람 pkencX</div>
        <input name='x' value={zktransferData.x} onChange={handleZktransferDataChange}/>
        <div>보내는 사람 pkencY</div>
        <input name='y' value={zktransferData.y} onChange={handleZktransferDataChange}/>
        <div>보내는 사람 sk</div>
        <input name='sk' value={zktransferData.sk} onChange={handleZktransferDataChange}/>
        <div>받는 사람 주소</div>
        <input name='receiverAddress' value={zktransferData.receiverAddress} onChange={handleZktransferDataChange}/>

        <div>fromPublicAmount</div>
        <input name='fromPublicAmount' value={Number(amounts.fromPublicAmount)} onChange={handleAmountChange}/>
        <div>fromPrivateAmount</div>
        <input name='fromPrivateAmount' value={Number(amounts.fromPrivateAmount)} onChange={handleAmountChange}/>
        <div>fromUnSpentNote</div>
        <input name='fromUnSpentNote' value={Number(amounts.fromUnSpentNote)} onChange={handleAmountChange}/>
        <div>toPublicAmount</div>
        <input name='toPublicAmount' value={Number(amounts.toPublicAmount)} onChange={handleAmountChange}/>
        <div>toPrivateAmount</div>
        <input name='toPrivateAmount' value={Number(amounts.toPrivateAmount)} onChange={handleAmountChange}/>

        <br/>
        <input type='button' value={"전송"} onClick={zktransfer}/>
      </div>
    </div>
  );
}

export default App;
