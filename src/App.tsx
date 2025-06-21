import './App.css';
import { ethers } from 'ethers';
import { useState } from 'react';
import { Network, Token, TokenType, TransferAmounts } from './type/types';
import { tranfer } from './azeroth/transfer';

function App() {
  const [senderAddress, setSenderAddress] = useState('');
  const [senderKey, setSenderKey] = useState('');
  const [receiverAddress, setReceiverAddress] = useState('');
  const [balanceAddress, setBalanceAddress] = useState('');
  const [amounts, setAmounts] = useState<TransferAmounts>(initAmounts());

  const hardhatNetwork: Network = {
    uid: 'hardhat-eth-31337',
    networkId: 31337,
    chainId: 31337,
    networkName: 'Hardhat Local',
    nativeSymbol: 'ETH',
    decimal: 18,
    networkIconUri: '',
    networkIconCache: '',
    azerothContractAddress: '0xYourZkMixerContract',
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
    tranfer({
        localStore,
        secretsDecryptionKey: secretsDecryptionKey as string,
        network: hardhatNetwork as Network,
        wallet: wallet as Wallet,
        token: ethNativeToken as Token,
        amounts: amounts,
        receiverAddr: receiverAddr as string,
        zkTxFee: zkTxFee ? zkTxFee : 0n,
        advanceProgress: () => {},
        onSuccess: () => {},
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
      <h2>이더리움 전송</h2>
      <div>보내는 사람 주소</div>
      <input value={senderAddress} onChange={e => setSenderAddress(e.target.value)}/>
      <div>보내는 사람 키</div>
      <input value={senderKey} onChange={e => setSenderKey(e.target.value)}/>
      <div>받는 사람 주소</div>
      <input value={receiverAddress} onChange={e => setReceiverAddress(e.target.value)}/>
      <br/>
      <input type='button' value={"전송"} onClick={transfer}/>

      <h2>잔액 확인</h2>
      <div>주소</div>
      <input value={balanceAddress} onChange={e => setBalanceAddress(e.target.value)}/>
      <input type='button' value={"확인"} onClick={getBalance}/>

      <h2>zktransfer</h2>
      <div>보내는 사람 주소</div>
      <input value={senderAddress} onChange={e => setSenderAddress(e.target.value)}/>
      <div>보내는 사람 키</div>
      <input value={senderKey} onChange={e => setSenderKey(e.target.value)}/>
      <div>받는 사람 주소</div>
      <input value={receiverAddress} onChange={e => setReceiverAddress(e.target.value)}/>

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
      <input type='button' value={"전송"} onClick={transfer}/>

    </div>
  );
}

export default App;
