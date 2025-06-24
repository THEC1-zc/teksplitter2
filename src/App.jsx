import React, { useState } from 'react';
import { ethers } from 'ethers';
import './App.css';

const CONTRACT_ADDRESS = '0x798763FF2cb11523344Fca274A19C393B3D921eF';
const CONTRACT_ABI = [
  "function distribute(address tokenAddress) external"
];

function App() {
  const [walletConnected, setWalletConnected] = useState(false);
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [contract, setContract] = useState(null);
  const [tokenList, setTokenList] = useState([]);
  const [status, setStatus] = useState("");

  async function connectWallet() {
    if (!window.ethereum) return alert("Installa MetaMask");

    const prov = new ethers.BrowserProvider(window.ethereum);
    const signer = await prov.getSigner();
    const acc = await signer.getAddress();

    const ct = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
    setProvider(prov);
    setContract(ct);
    setWalletConnected(true);
    setAccount(acc);

    await loadTokens(prov);
  }

  async function loadTokens(prov) {
    const logs = await prov.send("eth_getLogs", [{
      address: CONTRACT_ADDRESS,
      fromBlock: "0x0",
      toBlock: "latest",
      topics: ["0xddf252ad"] // ERC20 Transfer event signature
    }]);
    const tokens = Array.from(new Set(logs.map(l => l.address)));
    const erc20 = [
      "function balanceOf(address) view returns (uint256)",
      "function decimals() view returns (uint8)",
      "function symbol() view returns (string)"
    ];
    const list = [];
    for (const addr of tokens) {
      try {
        const tk = new ethers.Contract(addr, erc20, prov);
        const bal = await tk.balanceOf(CONTRACT_ADDRESS);
        if (bal > 0n) {
          const dec = await tk.decimals();
          const sym = await tk.symbol();
          list.push({ address: addr, balance: bal, decimals: dec, symbol: sym });
        }
      } catch (e) {
        console.warn(`Errore token ${addr}`, e);
      }
    }
    setTokenList(list);
  }

  return (
    <div className="container">
      <h1>Teksplitter</h1>
      <p><strong>Contract:</strong> <code>{CONTRACT_ADDRESS}</code></p>

      {!walletConnected ? (
        <button onClick={connectWallet}>Connect MetaMask</button>
      ) : (
        <>
          <p><strong>Wallet:</strong> {account}</p>

          <h3>Token presenti nel contratto:</h3>
          {tokenList.length === 0 ? (
            <p>Nessun token rilevato.</p>
          ) : (
            <ul>
              {tokenList.map((tk, idx) => (
                <li key={idx}>
                  {tk.symbol} – {ethers.formatUnits(tk.balance, tk.decimals)}{' '}
                  (<code>{tk.address}</code>)
                </li>
              ))}
            </ul>
          )}

          <p style={{ marginTop: '1rem', color: '#555' }}>
            Ora puoi distribuire tutto o token specifici.
          </p>
        </>
      )}

      <p>{status}</p>
    </div>
  );
}

export default App;
