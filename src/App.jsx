
import React, { useState } from 'react';
import { ethers } from 'ethers';

const CONTRACT_ADDRESS = "0x798763FF2cb11523344Fca274A19C393B3D921eF";
const ABI = [
  {
    "inputs": [],
    "name": "distributeAll",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

function App() {
  const [walletAddress, setWalletAddress] = useState(null);
  const [txHash, setTxHash] = useState("");
  const [loading, setLoading] = useState(false);

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("Please install MetaMask.");
      return;
    }
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    setWalletAddress(accounts[0]);
  };

  const distributeTokens = async () => {
    try {
      setLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
      const tx = await contract.distributeAll();
      await tx.wait();
      setTxHash(tx.hash);
    } catch (error) {
      console.error("Distribution failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Teksplitter</h1>
      <p><strong>Contract:</strong> {CONTRACT_ADDRESS}</p>
      {!walletAddress ? (
        <button onClick={connectWallet}>Connect MetaMask</button>
      ) : (
        <div>
          <p>Connected: {walletAddress}</p>
          <button onClick={distributeTokens} disabled={loading}>
            {loading ? "Distributing..." : "Distribute"}
          </button>
        </div>
      )}
      {txHash && (
        <p>
          ✅ Success! Tx: <a href={`https://basescan.org/tx/${txHash}`} target="_blank" rel="noreferrer">{txHash}</a>
        </p>
      )}
    </div>
  );
}

export default App;
