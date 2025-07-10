const contractAddress = "0x9D8fED8E3D22adF274186e7d4c6eCEeD8E24dc1F";
const faucetAbi = [
    "function faucet() external",
    "event FaucetSuccess(address indexed recipient, uint256 amount, uint256 nextEligibleTime)",
    "event FaucetDenied(address indexed recipient, string reason)"
];

const sendButton = document.getElementById("sendButton");
const walletInput = document.getElementById("walletAddress");
const messageDiv = document.getElementById("message");
const walletButton = document.getElementById("walletButton");
const faucetBalanceDiv = document.getElementById("faucetBalance");

const MONAD_CHAIN_ID = 10143; // Use number, not string

let provider = null;
let signer = null;
let userAddress = null;

function showMessage(msg, isError = false) {
    messageDiv.textContent = msg;
    messageDiv.style.color = isError ? "#ff6b6b" : "#fff";
}

function shortenAddress(addr) {
    return addr.slice(0, 6) + "..." + addr.slice(-4);
}

function setWalletUI(connected, address = "") {
    if (connected) {
        walletButton.textContent = `Connected: ${shortenAddress(address)}`;
        walletButton.classList.add("connected");
        walletButton.classList.remove("disconnect");
        walletInput.value = address;
        walletInput.readOnly = true;
        sendButton.disabled = false;
    } else {
        walletButton.textContent = "Connect Wallet";
        walletButton.classList.remove("connected");
        walletButton.classList.remove("disconnect");
        walletInput.value = "";
        walletInput.placeholder = "Connect your wallet";
        walletInput.readOnly = true;
        sendButton.disabled = true;
    }
}

async function fetchFaucetBalance() {
    try {
        // Use public provider if wallet not connected
        let ethProvider;
        if (window.ethereum) {
            ethProvider = new ethers.providers.Web3Provider(window.ethereum);
        } else {
            ethProvider = ethers.getDefaultProvider(); // fallback, may not work for Monad
        }
        const balance = await ethProvider.getBalance(contractAddress);
        const monad = ethers.utils.formatEther(balance);
        faucetBalanceDiv.textContent = `Faucet Balance: ${monad} MONAD`;
    } catch (err) {
        faucetBalanceDiv.textContent = "Faucet Balance: --";
    }
}

async function connectWallet() {
    if (!window.ethereum) {
        showMessage("No wallet found. Please install MetaMask or Rabby.", true);
        return;
    }
    try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();
        userAddress = await signer.getAddress();
        // Check network
        const { chainId } = await provider.getNetwork();
        console.log("Current chainId:", chainId, "Expected:", MONAD_CHAIN_ID);
        if (chainId !== MONAD_CHAIN_ID) {
            showMessage("Please switch your wallet to Monad testnet.", true);
            setWalletUI(false);
            return;
        }
        setWalletUI(true, userAddress);
        showMessage("");
    } catch (err) {
        showMessage("Wallet connection failed.", true);
        setWalletUI(false);
    }
}

function disconnectWallet() {
    provider = null;
    signer = null;
    userAddress = null;
    setWalletUI(false);
    showMessage("");
}

walletButton.addEventListener("click", () => {
    if (userAddress) {
        // Disconnect
        disconnectWallet();
    } else {
        connectWallet();
    }
});

async function connectAndSend() {
    if (!userAddress || !signer) {
        showMessage("Please connect your wallet first.", true);
        return;
    }
    try {
        const contract = new ethers.Contract(contractAddress, faucetAbi, signer);
        showMessage("Sending request...", false);
        const tx = await contract.faucet();
        showMessage("Waiting for confirmation...", false);
        await tx.wait();
        showMessage("Success! 0.5 MONAD sent (if eligible). Check your wallet.");
        fetchFaucetBalance(); // update after sending
    } catch (err) {
        let msg = err && err.message ? err.message : String(err);
        if (msg.includes("Cooldown")) {
            showMessage("You have already claimed. Please wait 24 hours.", true);
        } else if (msg.includes("exceeds 5 MONAD")) {
            showMessage("Ineligible: Your balance exceeds 5 MONAD.", true);
        } else if (msg.includes("Faucet empty")) {
            showMessage("Faucet is empty. Please try again later.", true);
        } else if (msg.includes("denied")) {
            showMessage("Transaction denied in wallet.", true);
        } else {
            showMessage("Error: " + msg, true);
        }
    }
}

sendButton.addEventListener("click", connectAndSend);

document.addEventListener("DOMContentLoaded", () => {
    setWalletUI(false);
    fetchFaucetBalance();
}); 
