import { ethers } from 'ethers';
import DiceGameABI from '../../artifacts/contracts/DiceGame.sol/DiceGame.json';

const CONTRACT_ADDRESS = "0x2aF3733Be093331b70b4Ff07141C4F3FD3960b55";

export const connectWallet = async () => {
  try {
    if (window.ethereum) {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      
      const diceGameContract = new ethers.Contract(CONTRACT_ADDRESS, DiceGameABI.abi, signer);
      
      return {
        account: accounts[0],
        provider,
        signer,
        contract: diceGameContract
      };
    } else {
      alert("MetaMask not detected. Please install MetaMask to use this app.");
      return null;
    }
  } catch (error) {
    console.error("Error connecting to wallet:", error);
    return null;
  }
};

export const depositETH = async (contract) => {
  try {
    const amount = ethers.utils.parseEther("0.1"); // Deposit 0.1 ETH
    const tx = await contract.deposit({ value: amount });
    await tx.wait();
    return true;
  } catch (error) {
    console.error("Error depositing ETH:", error);
    return false;
  }
};

export const withdrawETH = async (contract) => {
  try {
    const amount = ethers.utils.parseEther("0.1"); // Withdraw 0.1 ETH
    const tx = await contract.withdraw(amount);
    await tx.wait();
    return true;
  } catch (error) {
    console.error("Error withdrawing ETH:", error);
    return false;
  }
};

export const rollDice = async (contract, betAmount) => {
  try {
    const betAmountWei = ethers.utils.parseEther(betAmount.toString());
    const tx = await contract.rollDice(betAmountWei);
    await tx.wait();
    return true;
  } catch (error) {
    console.error("Error rolling dice:", error);
    return false;
  }
};