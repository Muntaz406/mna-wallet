const CORRECT_PIN = "081227";
let enteredPin = "";
const DEFAULT_AVATAR = "https://ui-avatars.com/api/?name=VIP&background=0D8ABC&color=fff";

const cryptoDB = [
    { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', defaultPrice: 65120, img: 'https://assets.coingecko.com/coins/images/1/standard/bitcoin.png', tvSymbol: 'BINANCE:BTCUSDT' },
    { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', defaultPrice: 3450, img: 'https://assets.coingecko.com/coins/images/279/standard/ethereum.png', tvSymbol: 'BINANCE:ETHUSDT' },
    { id: 'tether', symbol: 'USDT', name: 'Tether', defaultPrice: 1.00, img: 'https://assets.coingecko.com/coins/images/325/standard/Tether.png', tvSymbol: 'BINANCE:USDTUSD' },
    { id: 'solana', symbol: 'SOL', name: 'Solana', defaultPrice: 145, img: 'https://assets.coingecko.com/coins/images/4128/standard/solana.png', tvSymbol: 'BINANCE:SOLUSDT' },
    { id: 'binancecoin', symbol: 'BNB', name: 'BNB', defaultPrice: 580, img: 'https://assets.coingecko.com/coins/images/825/standard/bnb-icon2_2x.png', tvSymbol: 'BINANCE:BNBUSDT' },
    { id: 'ripple', symbol: 'XRP', name: 'Ripple', defaultPrice: 0.62, img: 'https://assets.coingecko.com/coins/images/44/standard/xrp-symbol-white.png', tvSymbol: 'BINANCE:XRPUSDT' },
    { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin', defaultPrice: 0.16, img: 'https://assets.coingecko.com/coins/images/5/standard/dogecoin.png', tvSymbol: 'BINANCE:DOGEUSDT' },
    { id: 'shiba-inu', symbol: 'SHIB', name: 'Shiba Inu', defaultPrice: 0.000025, img: 'https://assets.coingecko.com/coins/images/11939/standard/shiba.png', tvSymbol: 'BINANCE:SHIBUSDT' },
    { id: 'pepe', symbol: 'PEPE', name: 'Pepe', defaultPrice: 0.000008, img: 'https://assets.coingecko.com/coins/images/29850/standard/pepe-token.jpeg', tvSymbol: 'BINANCE:PEPEUSDT' }
];

let appState = {
    username: "VIP ACCOUNT",
    totalBalance: 15400.50,
    profilePic: DEFAULT_AVATAR,
    shares: { 'BTC': 0.4, 'ETH': 0.3, 'SOL': 0.1, 'PEPE': 0.1, 'USDT': 0.1 },
    prices: {},
    history: [] // Tambahan fitur riwayat
};

function initFallbackPrices() {
    cryptoDB.forEach(coin => {
        if (!appState.prices[coin.symbol]) {
            appState.prices[coin.symbol] = { usd: coin.defaultPrice, change: (Math.random() * 5).toFixed(2) };
        }
    });
}

async function fetchLivePrices() {
    try {
        const ids = cryptoDB.map(c => c.id).join(',');
        const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`);
        if (!response.ok) throw new Error("API Limit Reached");
        const data = await response.json();
        
        cryptoDB.forEach(coin => {
            if (data[coin.id] && data[coin.id].usd) {
                appState.prices[coin.symbol] = { usd: data[coin.id].usd, change: data[coin.id].usd_24h_change || 0 };
            }
        });
        saveData();
    } catch (error) {
        console.warn("Using Fallback Prices.");
    } finally {
        renderHomeAssets();
        renderMarketAssets();
    }
}

function renderHomeAssets() {
    const totalEl = document.getElementById('totalBalance');
    if (totalEl) totalEl.innerText = appState.totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 });
    
    // Hitung Otomatis PNL Berdasarkan Pasar
    let totalChange = 0; let count = 0;
    cryptoDB.forEach(coin => {
        if (appState.prices[coin.symbol]) { totalChange += parseFloat(appState.prices[coin.symbol].change); count++; }
    });
    const avgChange = count > 0 ? (totalChange / count) : 0;
    const pnlValue = (appState.totalBalance * (avgChange / 100));
    
    const pnlText = document.getElementById('pnlText');
    const pnlIcon = document.getElementById('pnlIcon');
    if(pnlText && pnlIcon) {
        const sign = avgChange >= 0 ? '+' : '';
        pnlText.innerText = `${sign}$${Math.abs(pnlValue).toLocaleString('en-US', {minimumFractionDigits: 2})} (${sign}${avgChange.toFixed(2)}%)`;
        pnlText.className = `text-sm font-semibold ${avgChange >= 0 ? 'text-profit' : 'text-loss'}`;
        pnlIcon.className = `fa-solid ${avgChange >= 0 ? 'fa-caret-up text-profit' : 'fa-caret-down text-loss'}`;
    }

    const container = document.getElementById('homeAssetList');
    if (!container) return;
    container.innerHTML = '';
    
    cryptoDB.forEach(coin => {
        if (appState.shares[coin.symbol] && appState.prices[coin.symbol]) {
            const price = appState.prices[coin.symbol].usd;
            const fiatValue = appState.totalBalance * appState.shares[coin.symbol];
            const amount = fiatValue / price;
            container.innerHTML += createCoinCard(coin, fiatValue, amount, false);
        }
    });
}

function renderMarketAssets() {
    const container = document.getElementById('marketAssetList');
    if (!container) return;
    container.innerHTML = '';
    cryptoDB.forEach(coin => {
        if (appState.prices[coin.symbol]) container.innerHTML += createCoinCard(coin, 0, 0, true);
    });
}

function createCoinCard(coin, fiatValue, amount, isMarket = false) {
    const data = appState.prices[coin.symbol] || { usd: coin.defaultPrice, change: 0 };
    const pnlClass = data.change >= 0 ? 'text-green-500' : 'text-red-500';
    const pnlSign = data.change >= 0 ? '+' : '';
    const priceText = data.usd < 1 ? data.usd.toFixed(6) : data.usd.toLocaleString('en-US', {minimumFractionDigits: 2});

    const rightSide = isMarket 
        ? `<h4 class="font-bold text-[15px] text-white">$${priceText}</h4><p class="${pnlClass} font-mono-num text-[11px]">${pnlSign}${parseFloat(data.change).toFixed(2)}%</p>`
        : `<h4 class="font-bold text-[15px] text-white">$${fiatValue.toLocaleString('en-US', {minimumFractionDigits: 2})}</h4><p class="text-gray-500 font-mono-num text-[11px]">${amount.toFixed(4)} ${coin.symbol}</p>`;

    const onClickAttr = isMarket ? `onclick="changeChart('${coin.tvSymbol}')" class="bg-[#141419] p-4 rounded-2xl flex justify-between items-center border border-gray-800/50 hover:bg-gray-800 cursor-pointer transition"` 
                                 : `class="bg-[#141419] p-4 rounded-2xl flex justify-between items-center border border-gray-800/50"`;

    const fallbackImage = `onerror="this.onerror=null;this.src='https://ui-avatars.com/api/?name=${coin.symbol}&background=1a1a1a&color=fff';"`;

    return `<div ${onClickAttr}><div class="flex items-center gap-4"><img src="${coin.img}" alt="${coin.symbol}" class="coin-logo" ${fallbackImage}><div><h4 class="font-bold text-[15px] text-white">${coin.symbol}</h4><p class="text-[11px] text-gray-400">${coin.name}</p></div></div><div class="text-right">${rightSide}</div></div>`;
}

// Fitur Baru: Render History Transaksi
function renderHistory() {
    const container = document.getElementById('historyList');
    if (!container) return;
    const history = appState.history || [];
    if (history.length === 0) {
        container.innerHTML = `<p class="text-xs text-gray-500 text-center py-4 bg-gray-900/50 rounded-xl">No recent transactions</p>`;
        return;
    }
    container.innerHTML = history.slice(0, 8).map(tx => `
        <div class="bg-[#141419] p-3 rounded-xl border border-gray-800/50 flex justify-between items-center">
            <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full ${tx.type==='Send'?'bg-red-500/10 text-red-400':'bg-green-500/10 text-green-400'} flex items-center justify-center">
                    <i class="fa-solid ${tx.type==='Send'?'fa-arrow-up':'fa-arrow-down'}"></i>
                </div>
                <div><p class="text-[13px] font-bold text-white">${tx.title}</p><p class="text-[9px] text-gray-500 font-mono">TXID: ${tx.id}</p></div>
            </div>
            <p class="text-[13px] font-bold ${tx.type==='Send'?'text-red-400':'text-green-400'}">${tx.type==='Send'?'-':'+'}$${tx.amount.toLocaleString()}</p>
        </div>
    `).join('');
}

function addTransaction(title, amount, type) {
    if(!appState.history) appState.history = [];
    const txid = "0x" + Math.random().toString(16).substr(2, 12).toUpperCase();
    appState.history.unshift({ title, amount, type, id: txid });
    saveData();
    renderHistory();
}

function loadSaveData() {
    const saved = localStorage.getItem('mna_vip_wallet');
    if (saved) appState = { ...appState, ...JSON.parse(saved) };
    initFallbackPrices(); updateProfileImages(); updateUsernameUI(); 
    renderHomeAssets(); renderMarketAssets(); renderHistory(); fetchLivePrices(); 
}

function saveData() { localStorage.setItem('mna_vip_wallet', JSON.stringify(appState)); }

function updateUsernameUI() {
    const uName = appState.username || "VIP ACCOUNT";
    const headEl = document.getElementById('headerUsername');
    const modEl = document.getElementById('modalUsername');
    const pinEl = document.getElementById('pinUsername');
    if (headEl) headEl.innerText = uName; if (modEl) modEl.innerText = uName; if (pinEl) pinEl.innerText = `Welcome Back, ${uName.split(' ')[0]}`;
}

function editUsername() {
    const newName = prompt("Enter new Username:", appState.username);
    if (newName && newName.trim() !== "") { appState.username = newName.trim(); saveData(); updateUsernameUI(); showToast("Username Updated!"); }
}

function changeChart(symbol) {
    if (typeof TradingView === 'undefined') return;
    document.getElementById('tradingview_mna').innerHTML = '';
    new TradingView.widget({
        "autosize": true, "symbol": symbol, "interval": "60", "timezone": "Etc/UTC", "theme": "dark", "style": "1", "locale": "en", "enable_publishing": false,
        "backgroundColor": "rgba(10, 10, 12, 0)", "gridColor": "rgba(255, 255, 255, 0.05)", "hide_top_toolbar": true, "hide_legend": true, "save_image": false, "container_id": "tradingview_mna"
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateProfileImages() { ['pinProfileImg', 'headerProfileImg', 'modalProfileImg'].forEach(id => { const el = document.getElementById(id); if (el) el.src = appState.profilePic; }); }

document.getElementById('profileUpload').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) { const reader = new FileReader(); reader.onload = function(e) { appState.profilePic = e.target.result; updateProfileImages(); saveData(); showToast("Profile Picture Saved!"); }; reader.readAsDataURL(file); }
});

function showPinScreen() { const ps = document.getElementById('pin-screen'); ps.classList.remove('hidden'); setTimeout(() => ps.classList.remove('opacity-0'), 50); }
function enterPin(num) { if (enteredPin.length < 6) { enteredPin += num; updatePinUI(); } if (enteredPin.length === 6) verifyPin(); }
function deletePin() { enteredPin = enteredPin.slice(0, -1); updatePinUI(); }
function clearPin() { enteredPin = ""; updatePinUI(); }
function updatePinUI() { document.querySelectorAll('.pin-dot').forEach((dot, idx) => { idx < enteredPin.length ? dot.classList.add('filled') : dot.classList.remove('filled'); }); }
function verifyPin() {
    if (enteredPin === CORRECT_PIN) {
        document.getElementById('pin-screen').classList.add('opacity-0');
        setTimeout(() => { document.getElementById('pin-screen').classList.add('hidden'); document.getElementById('main-app').classList.remove('hidden'); document.getElementById('main-app').classList.add('animate-fade'); changeChart("BINANCE:BTCUSDT"); showToast("Access Granted"); }, 500);
    } else { showToast("Wrong PIN!"); clearPin(); }
}

function navSwitch(pageId) {
    document.querySelectorAll('.page-view').forEach(p => p.classList.add('hidden'));
    document.querySelectorAll('.nav-btn').forEach(b => { b.classList.remove('text-cyan-400'); if(!b.classList.contains('bg-gradient-to-r')) b.classList.add('text-gray-500'); });
    document.getElementById(`page-${pageId}`).classList.remove('hidden');
    if(pageId !== 'swap') { document.getElementById(`nav-${pageId}`).classList.remove('text-gray-500'); document.getElementById(`nav-${pageId}`).classList.add('text-cyan-400'); }
}

// Logika Transaksi & History Baru
function handleAction(type) {
    const body = document.getElementById('actionBody');
    if(type==='send') body.innerHTML = `<input type="text" placeholder="Wallet Address" class="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 mb-3 text-white"><input type="number" id="sendAmt" placeholder="Amount (USD)" class="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white mb-4"><button onclick="executeSend()" class="w-full bg-blue-600 text-white font-bold py-3 rounded-xl">Send Crypto</button>`;
    else if(type==='receive') body.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=0xVIPAddress" class="mx-auto rounded-xl mb-3"><p class="text-gray-400 font-mono bg-gray-900 p-2">0xVIP...89A</p>`;
    else if(type==='topup') body.innerHTML = `<input type="number" id="topupAmt" placeholder="USD Amount" class="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white mb-4"><button onclick="executeTopUp()" class="w-full bg-green-600 text-white font-bold py-3 rounded-xl">Top Up</button>`;
    toggleModal('actionModal');
}

function executeSend() { 
    const amt = parseFloat(document.getElementById('sendAmt').value); 
    if(amt>0 && appState.totalBalance >= amt) { appState.totalBalance -= amt; addTransaction("Transfer Crypto", amt, "Send"); renderHomeAssets(); toggleModal('actionModal'); showToast("Send Complete!"); } 
    else { showToast("Invalid amount/balance!"); }
}

function executeTopUp() { 
    const amt = parseFloat(document.getElementById('topupAmt').value); 
    if(amt>0) { appState.totalBalance+=amt; addTransaction("Top Up Deposit", amt, "Receive"); renderHomeAssets(); toggleModal('actionModal'); showToast(`Top Up $${amt} Success!`); } 
}

function scanQRIS() {
    showToast("Membuka Kamera...");
    setTimeout(() => {
        const amt = prompt("QRIS Terdeteksi! Masukkan nominal pembayaran (USD):");
        if(amt && !isNaN(amt) && appState.totalBalance >= parseFloat(amt)) {
            appState.totalBalance -= parseFloat(amt);
            addTransaction("Bayar QRIS", parseFloat(amt), "Send");
            renderHomeAssets(); showToast("Pembayaran QRIS Sukses!");
        } else { showToast("Saldo Tidak Cukup!"); }
    }, 1000);
}

function executeSwap() { showToast("Swap Processed"); setTimeout(()=>navSwitch('home'), 1500); }
function triggerCheatSystem() { if(prompt("Code:")==="MNA2026") { const bal = prompt("New USD Balance:"); if(bal) { appState.totalBalance = parseFloat(bal); saveData(); renderHomeAssets(); showToast("Balance Updated"); } } }
function toggleModal(id) { const m = document.getElementById(id); if (!m) return; if(m.classList.contains('modal-active')) { m.classList.remove('modal-active'); setTimeout(()=>m.style.display='none',300); } else { m.style.display='block'; setTimeout(()=>m.classList.add('modal-active'),10); } }
function showToast(msg) { const container = document.getElementById('toast-container'); const toast = document.createElement('div'); toast.className = 'bg-gray-800 text-white px-6 py-3 rounded-full shadow-lg border border-gray-700 text-sm font-semibold toast-enter flex items-center gap-3'; toast.innerHTML = `<i class="fa-solid fa-bell text-blue-400"></i> ${msg}`; container.appendChild(toast); setTimeout(() => { toast.style.opacity='0'; setTimeout(()=>toast.remove(),500); }, 3000); }

document.addEventListener('DOMContentLoaded', () => {
    loadSaveData();
    setTimeout(() => { document.getElementById('splash-screen').style.opacity = '0'; setTimeout(() => { document.getElementById('splash-screen').style.display = 'none'; showPinScreen(); }, 800); }, 1500);
});
setInterval(fetchLivePrices, 15000);

