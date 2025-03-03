import React, { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import './App.css';

// smart contract ABI & address details
import DiceGameABI from '../artifacts/contracts/DiceGame.sol/DiceGame.json';
const CONTRACT_ADDRESS = "0x2aF3733Be093331b70b4Ff07141C4F3FD3960b55";

function App() {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [contract, setContract] = useState(null);
  const [signer, setSigner] = useState(null);
  const [balance, setBalance] = useState(0);
  const [betAmount, setBetAmount] = useState(100);
  const [isRolling, setIsRolling] = useState(false);
  const [diceResult, setDiceResult] = useState(null);
  const [resultMessage, setResultMessage] = useState('');
  const [transactions, setTransactions] = useState([]);

  const diceRef = useRef(null);

  const connectWallet = async () => {
    try {
      if (window.ethereum) {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        
        const diceGameContract = new ethers.Contract(CONTRACT_ADDRESS, DiceGameABI.abi, signer);
        
        setAccount(accounts[0]);
        setProvider(provider);
        setSigner(signer);
        setContract(diceGameContract);

        window.ethereum.on('accountsChanged', (accounts) => {
          setAccount(accounts[0]);
        });
      } else {
        alert("MetaMask not detected. Please install MetaMask to use this app.");
      }
    } catch (error) {
      console.error("Error connecting to wallet:", error);
    }
  };

  const fetchBalance = async () => {
    if (contract && account) {
      try {
        const userBalance = await contract.balances(account);
        setBalance(ethers.utils.formatEther(userBalance));
      } catch (error) {
        console.error("Error fetching balance:", error);
      }
    }
  };

  const depositETH = async () => {
    if (contract && signer) {
      try {
        const amount = ethers.utils.parseEther("0.1"); // Deposit 0.1 ETH
        const tx = await contract.deposit({ value: amount });
        await tx.wait();
        
        fetchBalance();
        
        setTransactions([{
          type: 'Deposit',
          amount: '0.1 ETH',
          timestamp: new Date().toLocaleString()
        }, ...transactions]);
      } catch (error) {
        console.error("Error depositing ETH:", error);
      }
    }
  };

  // Withdraw ETH from contract
  const withdrawETH = async () => {
    if (contract && signer) {
      try {
        const amount = ethers.utils.parseEther("0.1"); // Withdraw 0.1 ETH
        const tx = await contract.withdraw(amount);
        await tx.wait();
        
        fetchBalance();
        
        setTransactions([{
          type: 'Withdraw',
          amount: '0.1 ETH',
          timestamp: new Date().toLocaleString()
        }, ...transactions]);
      } catch (error) {
        console.error("Error withdrawing ETH:", error);
      }
    }
  };

  const rollDice = async () => {
    if (contract && signer) {
      try {
        setIsRolling(true);
        setResultMessage('');
        
        // hanlding the dice animation on roll trigger ( can be improved in future )
        if (diceRef.current) {
          diceRef.current.style.animation = 'rolling 2s';
          setTimeout(() => {
            if (diceRef.current) {
              diceRef.current.style.animation = '';
            }
          }, 2000);
        }

        const betAmountWei = ethers.utils.parseEther(betAmount.toString());
        // adding a 30% buffer on gas limit to avoid transaction failure
        const gasLimit = await contract.estimateGas.rollDice(betAmountWei);
        const tx = await contract.rollDice(betAmountWei, { gasLimit: gasLimit.mul(130).div(100) });
        // const tx = await contract.rollDice(betAmountWei);
        
        // appending roll result in history list
        contract.once("DiceRolled", (player, roll, win) => {
          const rollValue = roll.toNumber();
          setDiceResult(rollValue);
          
          const winOrLose = win ? "Won" : "Lost";
          const amountChange = win ? `+${betAmount * 2}` : `-${betAmount}`;
          
          setResultMessage(win ? 
            `You rolled a ${rollValue} and won ${betAmount * 2} ETH!` : 
            `You rolled a ${rollValue} and lost ${betAmount} ETH.`
          );
          
          setTransactions([{
            type: 'Bet',
            roll: rollValue,
            result: winOrLose,
            amount: amountChange,
            timestamp: new Date().toLocaleString()
          }, ...transactions]);
          
          setIsRolling(false);
          fetchBalance();
        });
        
        await tx.wait();
      } catch (error) {
        console.error("Error rolling dice:", error);
        setIsRolling(false);
        setResultMessage("Transaction failed. Please try again.");
      }
    }
  };

  useEffect(() => {
    if (contract && account) {
      fetchBalance();

      // Set up event listener for the contract
      const diceRolledFilter = contract.filters.DiceRolled(account);
      contract.on(diceRolledFilter, (player, roll, win) => {
        fetchBalance();
      });

      return () => {
        contract.removeAllListeners();
      };
    }
  }, [contract, account]);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-purple-500 mb-2">BetProvably</h1>
          <p className="text-gray-400">Roll 4, 5, or 6 to double your bet!</p>
        </header>

        {!account ? (
          <div className="text-center my-12">
            <button
              onClick={connectWallet}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg transform transition hover:scale-105"
            >
              Connect Wallet
            </button>
            <p className="mt-4 text-gray-400">Connect your MetaMask wallet to start playing</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-gray-800 rounded-xl p-6 shadow-xl">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-semibold">Your Balance</h2>
                  <p className="text-2xl font-bold text-green-400">{parseFloat(balance).toFixed(4)} ETH</p>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={depositETH}
                    className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg"
                  >
                    Deposit
                  </button>
                  <button
                    onClick={withdrawETH}
                    className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg"
                  >
                    Withdraw
                  </button>
                </div>
              </div>
              
              <div className="flex flex-col items-center justify-center py-8">
                {/* Dice */}
                <div 
                  ref={diceRef}
                  className={`dice mb-8 ${isRolling ? 'rolling' : ''}`}
                >
                  {diceResult ? (
                    <div className={`dice-face dice-${diceResult}`}>
                      {[...Array(diceResult)].map((_, i) => (
                        <div key={i} className="dot"></div>
                      ))}
                    </div>
                  ) : (
                    <div className="dice-face dice-6">
                      <div className="dot"></div>
                      <div className="dot"></div>
                      <div className="dot"></div>
                      <div className="dot"></div>
                      <div className="dot"></div>
                      <div className="dot"></div>
                    </div>
                  )}
                </div>
                
                {resultMessage && (
                  <div className={`text-center mb-6 text-xl ${
                    resultMessage.includes('won') ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {resultMessage}
                  </div>
                )}
                
                <div className="w-full max-w-md">
                  <div className="mb-4">
                    <label className="block text-gray-400 mb-2">Bet Amount (ETH)</label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={betAmount}
                      onChange={(e) => setBetAmount(parseFloat(e.target.value))}
                      className="w-full bg-gray-700 text-white py-3 px-4 rounded-lg"
                      disabled={isRolling}
                    />
                  </div>
                  
                  <button
                    onClick={rollDice}
                    disabled={isRolling || parseFloat(balance) < betAmount}
                    className={`w-full py-4 rounded-lg font-bold text-lg transition transform hover:scale-105 ${
                      isRolling || parseFloat(balance) < betAmount 
                      ? 'bg-gray-600 cursor-not-allowed' 
                      : 'bg-purple-600 hover:bg-purple-700 shadow-lg'
                    }`}
                  >
                    {isRolling ? 'Rolling...' : 'Roll Dice'}
                  </button>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-800 rounded-xl p-6 shadow-xl">
              <h2 className="text-xl font-semibold mb-4">Transaction History</h2>
              {transactions.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {transactions.map((tx, index) => (
                    <div key={index} className="bg-gray-700 p-3 rounded-lg">
                      <div className="flex justify-between">
                        <span className="font-medium">{tx.type}</span>
                        <span className={tx.type === 'Bet' && tx.result === 'Won' ? 'text-green-400' :
                          tx.type === 'Bet' && tx.result === 'Lost' ? 'text-red-400' :
                          tx.type === 'Deposit' ? 'text-green-400' : 'text-red-400'}>
                          {tx.amount}
                        </span>
                      </div>
                      {tx.type === 'Bet' && (
                        <div className="text-sm text-gray-400 mt-1">
                          Rolled: {tx.roll} - {tx.result}
                        </div>
                      )}
                      <div className="text-xs text-gray-500 mt-1">{tx.timestamp}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No transactions yet</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;