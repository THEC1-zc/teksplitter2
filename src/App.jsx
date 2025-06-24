import React, { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import './App.css';

const CONTRACT_ADDRESS = '0x798763FF2cb11523344Fca274A19C393B3D921eF';
const TRANSFER_TOPIC = ethers.id("Transfer(address,address,uint256)");

function App() {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [tokens, setTokens] = useState([]);
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (window.ethereum) {
      const ethProvider = new ethers.BrowserProvider(window.ethereum);
      setProvider(ethProvider);
    }
  }, []);

  const connectWallet = async () => {
    if (!provider) return;
    const signer = await provider.getSigner();
    const addr = await signer.getAddress();
    setAccount(addr);
  };

  const fetchTokens = async () => {
    if (!provider) return;

    const logs = await provider.send("eth_getLogs", [{
      fromBlock: "0x0",
      toBlock: "latest",
      topics: [
        TRANSFER_TOPIC,
        null,
        ethers.hexZeroPad(CONTRACT_ADDRESS.toLowerCase(), 32)
      ]
    }]);

    const tokenAddresses = [...new Set(logs.map(log => log.address.toLowerCase()))];
    const signer = await provider.getSigner();

    const tokensWithData = await Promise.all(tokenAddresses.map(async (tokenAddress) => {
      try {
        const abi = [
          "function symbol() view returns (string)",
          "function name() view returns (string)",
          "function decimals() view returns (uint8)",
          "function balanceOf(address) view returns (uint)"
        ];
        const token = new ethers.Contract(tokenAddress, abi, provider);
        const [symbol, name, decimals, balance] = await Promise.all([
          token.symbol(),
          token.name(),
          token.decimals(),
          token.balanceOf(CONTRACT_ADDRESS)
        ]);
        return { address: tokenAddress, symbol, name, balance, decimals };
      } catch (e) {
        return null;
      }
    }));

    setTokens(tokensWithData.filter(t => t && t.balance > 0));
  };

  const distributeAll = async () => {
    if (!provider || !account) return;
    setStatus('Distributing all tokens...');
    try {
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ["function distribute(address token)"], signer);
      for (const token of tokens) {
        const tx = await contract.distribute(token.address);
        await tx.wait();
      }
      setStatus('All tokens distributed!');
    } catch (err) {
      setStatus('Distribution failed.');
      console.error(err);
    }
  };

  const distributeOne = async (tokenAddress) => {
    if (!provider || !account) return;
    setStatus(`Distributing ${tokenAddress}...`);
    try {
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ["function distribute(address token)"], signer);
      const tx = await contract.distribute(tokenAddress);
      await tx.wait();
      setStatus(`Token ${tokenAddress} distributed!`);
    } catch (err) {
      setStatus('Distribution failed.');
      console.error(err);
    }
  };

  return (
    <div className="App">
      <h1>Teksplitter</h1>
      <p>Contract address: <code>{CONTRACT_ADDRESS}</code></p>

      {!account && <button onClick={connectWallet}>Connect Metamask</button>}
      {account && <p>Connected: {account}</p>}

      {account && (
        <>
          <button onClick={fetchTokens}>Fetch Tokens</button>
          <button onClick={distributeAll}>Distribute All</button>
        </>
      )}

      {status && <p>Status: {status}</p>}

      {tokens.length > 0 && (
        <div>
          <h3>Tokens in Contract:</h3>
          <ul>
            {tokens.map((token, index) => (
              <li key={index}>
                <strong>{token.name}</strong> ({token.symbol})<br />
                Balance: {(token.balance / 10 ** token.decimals).toLocaleString()}<br />
                <button onClick={() => distributeOne(token.address)}>Distribute this token</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default App;
