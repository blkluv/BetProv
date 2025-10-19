import { ethers } from "ethers";
import DiceGameABI from "../../artifacts/contracts/DiceGame.sol/DiceGame.json";

const CONTRACT_ADDRESS = "0x2aF3733Be093331b70b4Ff07141C4F3FD3960b55";
const SEPOLIA_CHAIN_ID = "0xaa36a7"; // hex for Sepolia
const SEPOLIA_DECIMAL_ID = 11155111;

// ✅ Optional fallback RPC for read-only actions (no wallet)
const fallbackProvider = new ethers.providers.JsonRpcProvider(
  process.env.NEXT_PUBLIC_RPC_URL || "https://sepolia.infura.io/v3/YOUR_KEY"
);

// ✅ Connect wallet and get signer + contract instance
export const connectWallet = async () => {
  try {
    if (!window.ethereum) {
      alert("MetaMask not detected. Please install MetaMask.");
      return null;
    }

    // Explicitly request permissions for this origin
    await window.ethereum.request({
      method: "wallet_requestPermissions",
      params: [{ eth_accounts: {} }],
    });

    // Request account access
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });

    const provider = new ethers.providers.Web3Provider(window.ethereum, "any");
    const network = await provider.getNetwork();

    // ✅ Auto-switch to Sepolia if on the wrong network
    if (network.chainId !== SEPOLIA_DECIMAL_ID) {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: SEPOLIA_CHAIN_ID }],
      });
    }

    const signer = provider.getSigner();
    const diceGameContract = new ethers.Contract(
      CONTRACT_ADDRESS,
      DiceGameABI.abi,
      signer
    );

    console.log("✅ Wallet connected:", accounts[0]);
    return {
      account: accounts[0],
      provider,
      signer,
      contract: diceGameContract,
    };
  } catch (error) {
    console.error("❌ Error connecting wallet:", error);
    alert("Failed to connect wallet. Check MetaMask permissions.");
    return null;
  }
};

// ✅ Deposit ETH into contract
export const depositETH = async (contract, amountEth = "0.1") => {
  try {
    const amount = ethers.utils.parseEther(amountEth);
    const tx = await contract.deposit({ value: amount });
    console.log("📤 Depositing ETH...");
    await tx.wait();
    console.log("✅ Deposit confirmed!");
    return true;
  } catch (error) {
    console.error("❌ Error depositing ETH:", error);
    alert("Deposit failed. Check console for details.");
    return false;
  }
};

// ✅ Withdraw ETH from contract
export const withdrawETH = async (contract, amountEth = "0.1") => {
  try {
    const amount = ethers.utils.parseEther(amountEth);
    const tx = await contract.withdraw(amount);
    console.log("📥 Withdrawing ETH...");
    await tx.wait();
    console.log("✅ Withdrawal confirmed!");
    return true;
  } catch (error) {
    console.error("❌ Error withdrawing ETH:", error);
    alert("Withdrawal failed. Check console for details.");
    return false;
  }
};

// ✅ Roll the dice
export const rollDice = async (contract, betAmount) => {
  try {
    if (!contract) throw new Error("Contract not initialized.");

    const betAmountWei = ethers.utils.parseEther(betAmount.toString());
    console.log(`🎲 Rolling dice with bet: ${betAmount} ETH...`);

    const tx = await contract.rollDice(betAmountWei);
    console.log("📡 Transaction sent:", tx.hash);

    const receipt = await tx.wait();
    console.log("✅ Dice rolled! Transaction mined:", receipt.transactionHash);

    return true;
  } catch (error) {
    console.error("❌ Error rolling dice:", error);

    if (error.code === 4001) {
      alert("Transaction rejected by user.");
    } else if (error.code === -32603) {
      alert("Internal JSON-RPC error. Try switching networks in MetaMask.");
    } else {
      alert("Dice roll failed. See console for details.");
    }

    return false;
  }
};

// ✅ Optional read-only contract instance without wallet
export const getReadOnlyContract = () => {
  return new ethers.Contract(CONTRACT_ADDRESS, DiceGameABI.abi, fallbackProvider);
};