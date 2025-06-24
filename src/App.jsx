import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import './App.css';

const CONTRACT_ADDRESS = '0x798763FF2cb11523344Fca274A19C393B3D921eF';
const CONTRACT_ABI = [
  {
    "inputs": [{ "internalType": "address", "name": "tokenAddress", "type": "address" }],
    "name": "distribute",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

const recipientMap = {
  "0xeaBeE1Bd61BD8b34adb51101758F0D6fc0684E9f": "e2005pe",
  "0x439fA2151077AE77c377D43E6ef80E9f9BBedc1f": "buckyball",
  "0x352d5DE48541Bb3487f77174cC41aE6F86ff19DD": "technic42"
};

function App() {
  const [connected, setConnected] = useState(false);
  const [account, setAccount] = useState(null);
  const [status, setStatus] = useState('');
  const [txHash, setTxHash] = useState('');
  const [lastToken, setLastToken] = useState('');
  const [lastAmounts, setLastAmounts] = useState([]);
  const [tokenBalances, setTokenBalances] = useState([]);

  async function connectWallet() {
    if (window.ethereum) {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      setAccount(address);
      setConnected(true);
      await fetchAllBalances(provider);
    } else {
      alert('MetaMask not detected');
    }
  }

  async function fetchAllBalances(provider) {
    try {
      const logs = await provider.send("eth_getLogs", [{
        address: CONTRACT_ADDRESS,
        fromBlock: "0x0",
        toBlock: "latest",
        topics: ["0xddf252ad"]
      }]);

      const tokenAddresses = [...new Set(logs.map(log => log.address))];
      const balances = [];

      for (let tokenAddr of tokenAddresses) {
        try {
          const erc20Abi = ["function balanceOf(address) view returns (uint256)", "function decimals() view returns (uint8)", "function symbol() view returns (string)"];
          const token = new ethers.Contract(tokenAddr, erc20Abi, provider);
          const balance = await token.balanceOf(CONTRACT_ADDRESS);
          if (balance > 0n) {
            const decimals = await token.decimals();
            const symbol = await token.symbol();
            balances.push({
              address: tokenAddr,
              symbol,
              formatted: ethers.formatUnits(balance, decimals),
              decimals,
              raw: balance
            });
          }
        } catch (e) {
          console.warn("Errore su token", tokenAddr);
        }
      }

      setTokenBalances(balances);
    } catch (err) {
      console.error("Errore nel recupero token:", err);
    }
  }

  async function distributeToken(tokenAddress, decimals, symbol) {
    setStatus(`⏳ Distribuzione in corso per ${symbol}...`);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      const erc20Abi = ["function balanceOf(address) view returns (uint256)"];
      const token = new ethers.Contract(tokenAddress, erc20Abi, provider);
      const balance = await token.balanceOf(CONTRACT_ADDRESS);

      const tx = await contract.distribute(tokenAddress);
      await tx.wait();

      setTxHash(tx.hash);
      setStatus(`✅ ${symbol} distribuito correttamente!`);
      setLastToken(`${symbol} (${tokenAddress})`);

      const amounts = [
        { address: "0xeaBeE1Bd61BD8b34adb51101758F0D6fc0684E9f", amount: balance * 50n / 100n },
        { address: "0x439fA2151077AE77c377D43E6ef80E9f9BBedc1f", amount: balance * 30n / 100n },
        { address: "0x352d5DE48541Bb3487f77174cC41aE6F86ff19DD", amount: balance * 20n / 100n }
      ];

      setLastAmounts(amounts.map(a => ({
        ...a,
        label: recipientMap[a.address],
        formatted: ethers.formatUnits(a.amount, decimals)
      })));

      await fetchAllBalances(provider);
    } catch (error) {
      setStatus(`❌ Errore nella distribuzione di ${symbol}`);
      console.error(error);
    }
  }

  async function distributeAllTokens() {
    for (let token of tokenBalances) {
      await distributeToken(token.address, token.decimals, token.symbol);
    }
  }

  return (
    <div className="container">
      <h1>Teksplitter</h1>
      <p><strong>Contract:</strong> <code>{CONTRACT_ADDRESS}</code></p>

      {!connected ? (
        <button onClick={connectWallet}>Connect MetaMask</button>
      ) : (
        <>
          <p><strong>Wallet:</strong> {account}</p>
          <button onClick={distributeAllTokens}>Distribute All</button>

          <h3>Token balances in contract:</h3>
          {tokenBalances.length === 0 ? (
            <p>No token balances found.</p>
          ) : (
            <ul>
              {tokenBalances.map((t, i) => (
                <li key={i}>
                  {t.symbol} → {t.formatted} ({t.address}){' '}
                  <button onClick={() => distributeToken(t.address, t.decimals, t.symbol)}>Distribute</button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <p>{status}</p>
      {txHash && (
        <p>
          <a href={`https://basescan.org/tx/${txHash}`} target="_blank" rel="noreferrer">
            View Transaction
          </a>
        </p>
      )}
      {lastToken && (
        <>
          <h3>Last Distributed Token:</h3>
          <p>{lastToken}</p>
        </>
      )}
      {lastAmounts.length > 0 && (
        <>
          <h3>Breakdown:</h3>
          <ul>
            {lastAmounts.map((a, i) => (
              <li key={i}>
                {a.label} ({a.address}) → {a.formatted}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export default App;
