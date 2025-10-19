import { ethers } from "ethers";
import DiceGameABI from "../../artifacts/contracts/DiceGame.sol/DiceGame.json";

const CONTRACT_ADDRESS = "0x2aF3733Be093331b70b4Ff07141C4F3FD3960b55";
const SEPOLIA_CHAIN_ID = "0xaa36a7"; // hex for Sepolia
const SEPOLIA_DECIMAL_ID = 11155111;

// ✅ Optional fallback RPC for read-only actions (no wallet)
const fallbackProvider = new ethers.providers.JsonRpcProvider(
  process.env.NEXT_PUBLIC_RPC_URL || "https://sepolia.infura.io/v3/YOUR_KEY"
);

/**
 * ✅ Wait for MetaMask to inject window.ethereum (with timeout fallback)
 */
const waitForEthereum = async (timeout = 3000) => {
  return new Promise((resolve) => {
    if (typeof window.ethereum !== "undefined") return resolve(window.ethereum);

    const interval = setInterval(() => {
      if (typeof window.ethereum !== "undefined") {
        clearInterval(interval);
        resolve(window.ethereum);
      }
    }, 100);

    setTimeout(() => {
      clearInterval(interval);
      resolve(undefined);
    }, timeout);
  });
};

/**
 * ✅ Connect wallet with automatic domain permission handling
 */
export const connectWallet = async () => {
  try {
    const ethereum = await waitForEthereum();

    if (!ethereum) {
      // Graceful fallback UI: link to MetaMask install page
      if (window.confirm("MetaMask is not installed. Would you like to install it?")) {
        window.open("https://metamask.io/download/", "_blank");
      }
      throw new Error("MetaMask not detected");
    }

    // Request permissions explicitly — important for new domains
    await ethereum.request({
      method: "wallet_requestPermissions",
      params: [{ eth_accounts: {} }],
    });

    const accounts = await ethereum.request({ method: "eth_requestAccounts" });
    const provider = new ethers.providers.Web3Provider(ethereum, "any");
    const network = await provider.getNetwork();

    // ✅ Auto-switch to Sepolia if on wrong network
    if (network.chainId !== SEPOLIA_DECIMAL_ID) {
      try {
        await ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: SEPOLIA_CHAIN_ID }],
        });
      } catch (switchError) {
        if (switchError.code === 4902) {
          // Chain not added — prompt user to add it
          await ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: SEPOLIA_CHAIN_ID,
                rpcUrls: ["https://sepolia.infura.io/v3/YOUR_KEY"],
                chainName: "Sepolia Testnet",
                nativeCurrency: { name: "SepoliaETH", symbol: "ETH", decimals: 18 },
                blockExplorerUrls: ["https://sepolia.etherscan.io"],
              },
            ],
          });
        } else {
          throw switchError;
        }
      }
    }

    const signer = provider.getSigner();
    const diceGameContract = new ethers.Contract(CONTRACT_ADDRESS, DiceGameABI.abi, signer);

    console.log("✅ Wallet connected:", accounts[0]);
    return { account: accounts[0], provider, signer, contract: diceGameContract };
  } catch (error) {
    console.error("❌ Wallet connection error:", error);
    return null;
  }
};

/**
 * ✅ Deposit ETH into the contract
 */
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

/**
 * ✅ Withdraw ETH from the contract
 */
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

/**
 * ✅ Roll the dice (main game interaction)
 */
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

/**
 * ✅ Optional: Read-only contract instance without wallet
 */
export const getReadOnlyContract = () => {
  return new ethers.Contract(CONTRACT_ADDRESS, DiceGameABI.abi, fallbackProvider);
};