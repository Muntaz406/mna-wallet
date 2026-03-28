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
    { id: 'pepe', symbol: 'PEPE', name: 'Pepe', defaultPrice: 0.000008, img: 'https://assets.coingecko.com/coins/images/29850/standard/pepe-token.jpeg', tvSymbol: 'BINANCE:PEPEUSDT' }
];

const fiatRates = { USD: 1, IDR: 15650, EUR: 0.92, JPY: 151, GBP: 0.79 };
const currSymbols = { USD: '$', IDR: 'Rp ', EUR: '€', JPY: '¥', GBP: '£', BTC: '₿ ', ETH: 'Ξ ', SOL: 'SOL ' };

let appState = {
    username: "VIP ACCOUNT",
    totalBalance: 15400.50,
    baseCurrency: "USD",
    profilePic: DEFAULT_AVATAR,
    shares: { 'BTC': 0.4, 'ETH': 0.3, 'SOL': 0.1, 'PEPE': 0.1, 'USDT': 0.1 },
    prices: {},
    history: [],
    newsData: [] // Untuk menyimpan data berita In-App
};

// ============================================
// SYSTEM MULTI-CURRENCY
// ============================================
function formatCurrencyDisplay(usdAmount, forceSymbol = false) {
    const curr = appState.baseCurrency || 'USD';
    let finalAmount = 0; let symbol = currSymbols[curr] || curr + ' ';
    if (fiatRates[curr]) {
        finalAmount = usdAmount * fiatRates[curr];
        const isBigFiat = (curr === 'IDR' || curr === 'JPY');
        return (forceSymbol ? symbol : '') + finalAmount.toLocaleString(isBigFiat ? 'id-ID' : 'en-US', { minimumFractionDigits: isBigFiat ? 0 : 2, maximumFractionDigits: isBigFiat ? 0 : 2 });
    } else {
        const cryptoPrice = appState.prices[curr] ? appState.prices[curr].usd : 1;
        finalAmount = usdAmount / cryptoPrice;
        return (forceSymbol ? symbol : '') + finalAmount.toLocaleString('en-US', {minimumFractionDigits:4, maximumFractionDigits:6});
    }
}
function convertInputToUSD(inputAmount) {
    const curr = appState.baseCurrency || 'USD';
    if (fiatRates[curr]) return inputAmount / fiatRates[curr];
    if (appState.prices[curr]) return inputAmount * appState.prices[curr].usd;
    return inputAmount;
}
function changeBaseCurrency(curr) {
    appState.baseCurrency = curr; saveData();
    renderHomeAssets(); renderMarketAssets(); renderHistory(); showToast(`Mata uang diganti ke ${curr}`);
}

// ============================================
// MARKET PRICES
// ============================================
function initFallbackPrices() {
    cryptoDB.forEach(coin => { if (!appState.prices[coin.symbol]) appState.prices[coin.symbol] = { usd: coin.defaultPrice, change: (Math.random() * 5).toFixed(2) }; });
}
async function fetchLivePrices() {
    try {
        const ids = cryptoDB.map(c => c.id).join(',');
        const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`);
        if (!response.ok) throw new Error("API Limit");
        const data = await response.json();
        cryptoDB.forEach(coin => { if (data[coin.id] && data[coin.id].usd) appState.prices[coin.symbol] = { usd: data[coin.id].usd, change: data[coin.id].usd_24h_change || 0 }; });
        saveData();
    } catch (error) { console.warn("Using Fallback Prices."); } 
    finally { renderHomeAssets(); renderMarketAssets(); }
}

// ============================================
// IN-APP NEWS READER (FITUR BARU)
// ============================================
async function fetchCryptoNews() {
    const newsContainer = document.getElementById('newsList');
    if(!newsContainer) return;

    try {
        const rssUrl = 'https://portalkripto.com/feed/'; 
        const response = await fetch('https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent(rssUrl));

        if (!response.ok) throw new Error("Gagal akses server berita");
        const data = await response.json();

        if(!data.items || data.items.length === 0) {
            newsContainer.innerHTML = `<p class="text-center text-gray-500 py-10">Belum ada update berita hari ini.</p>`;
            return;
        }

        // Simpan berita ke memori agar bisa dibaca In-App
        appState.newsData = data.items.slice(0, 15);
        let html = '';
        
        appState.newsData.forEach((article, index) => {
            const pubTime = article.pubDate.split(' ')[1] ? article.pubDate.split(' ')[1].substring(0,5) : 'Baru saja';
            let imgUrl = article.thumbnail || (article.enclosure ? article.enclosure.link : 'https://ui-avatars.com/api/?name=Berita+Crypto&background=1a1a1a&color=00f2fe');

            // KLIK UNTUK MEMBUKA IN-APP READER
            html += `
            <div onclick="openNewsArticle(${index})" class="bg-[#141419] p-3 rounded-xl border border-gray-800/50 flex gap-4 cursor-pointer hover:bg-gray-800 transition mb-3">
                <div class="w-20 h-20 flex-shrink-0">
                    <img src="${imgUrl}" class="w-full h-full object-cover rounded-lg border border-gray-700" onerror="this.src='https://ui-avatars.com/api/?name=News&background=1a1a1a&color=fff'">
                </div>
                <div class="flex-1 flex flex-col justify-between">
                    <h4 class="text-white text-[13px] font-bold leading-tight line-clamp-2 mb-1">${article.title}</h4>
                    <div class="flex justify-between items-center mt-auto">
                        <span class="text-[10px] text-cyan-400 font-bold bg-cyan-400/10 px-2 py-0.5 rounded">PortalKripto ID</span>
                        <span class="text-[10px] text-gray-500"><i class="fa-regular fa-clock"></i> ${pubTime}</span>
                    </div>
                </div>
            </div>
            `;
        });
        newsContainer.innerHTML = html;

    } catch(e) {
        console.error("News Error:", e);
        newsContainer.innerHTML = `
            <div class="text-center py-10">
                <i class="fa-solid fa-satellite-dish text-red-500 text-3xl mb-3"></i>
                <p class="text-gray-400 text-xs">Jaringan terputus dari satelit berita.<br>Sistem Android menunda koneksi.</p>
                <button onclick="fetchCryptoNews()" class="mt-4 px-5 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-lg text-[10px] font-bold">Sinkronisasi Ulang</button>
            </div>
        `;
    }
}

// Menampilkan Berita Full Screen Dalam Aplikasi
function openNewsArticle(index) {
    const article = appState.newsData[index];
    if(!article) return;
    
    // Set Detail Tampilan
    const imgUrl = article.thumbnail || (article.enclosure ? article.enclosure.link : 'https://ui-avatars.com/api/?name=Berita+Crypto&background=1a1a1a&color=00f2fe');
    document.getElementById('newsReadImg').src = imgUrl;
    document.getElementById('newsReadTitle').innerText = article.title;
    document.getElementById('newsReadTime').innerText = article.pubDate.split(' ')[1] ? article.pubDate.split(' ')[1].substring(0,5) : '';
    
    // Set Isi Konten Artikel
    const contentHtml = article.content || article.description || "<p>Gagal memuat isi artikel.</p>";
    
    // Tambah tombol buka di browser untuk jaga-jaga kalau user butuh link aslinya
    const externalLinkBtn = `<br><button onclick="window.open('${article.link}', '_system')" class="w-full py-3 bg-gray-800 rounded-xl text-cyan-400 font-bold mt-4 border border-gray-700">Buka di Browser Asli</button>`;
    
    document.getElementById('newsReadContent').innerHTML = contentHtml + externalLinkBtn;

    // Tampilkan Modal Full Screen
    const modal = document.getElementById('newsDetailModal');
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.remove('translate-y-full'), 10);
}

// Tutup Artikel
function closeNewsArticle() {
    const modal = document.getElementById('newsDetailModal');
    modal.classList.add('translate-y-full');
    setTimeout(() => {
        modal.style.display = 'none';
        document.getElementById('newsReadContent').innerHTML = ''; // bersihkan memori
    }, 300);
}


// ============================================
// RENDERING UI UTAMA
// ============================================
function renderHomeAssets() {
    const totalEl = document.getElementById('totalBalance');
    if (totalEl) totalEl.innerText = formatCurrencyDisplay(appState.totalBalance, true);
    const currSelect = document.getElementById('currencySelect');
    if (currSelect) currSelect.value = appState.baseCurrency || 'USD';

    let totalChange = 0; let count = 0;
    cryptoDB.forEach(coin => { if (appState.prices[coin.symbol]) { totalChange += parseFloat(appState.prices[coin.symbol].change); count++; } });
    const avgChange = count > 0 ? (totalChange / count) : 0;
    const pnlValueUsd = (appState.totalBalance * (avgChange / 100));
    
    const pnlText = document.getElementById('pnlText'); const pnlIcon = document.getElementById('pnlIcon');
    if(pnlText && pnlIcon) {
        const sign = avgChange >= 0 ? '+' : '';
        pnlText.innerText = `${sign}${formatCurrencyDisplay(Math.abs(pnlValueUsd), true)} (${sign}${avgChange.toFixed(2)}%)`;
        pnlText.className = `text-sm font-semibold ${avgChange >= 0 ? 'text-profit' : 'text-loss'}`;
        pnlIcon.className = `fa-solid ${avgChange >= 0 ? 'fa-caret-up text-profit' : 'fa-caret-down text-loss'}`;
    }

    const container = document.getElementById('homeAssetList'); if (!container) return; container.innerHTML = '';
    cryptoDB.forEach(coin => {
        if (appState.shares[coin.symbol] && appState.prices[coin.symbol]) {
            const price = appState.prices[coin.symbol].usd; const usdValue = appState.totalBalance * appState.shares[coin.symbol];
            container.innerHTML += createCoinCard(coin, usdValue, usdValue / price, false);
        }
    });
}

function renderMarketAssets() {
    const container = document.getElementById('marketAssetList'); if (!container) return; container.innerHTML = '';
    cryptoDB.forEach(coin => { if (appState.prices[coin.symbol]) container.innerHTML += createCoinCard(coin, 0, 0, true); });
}

function createCoinCard(coin, usdValue, amount, isMarket = false) {
    const data = appState.prices[coin.symbol] || { usd: coin.defaultPrice, change: 0 };
    const pnlClass = data.change >= 0 ? 'text-green-500' : 'text-red-500';
    const pnlSign = data.change >= 0 ? '+' : '';
    const displayPriceText = formatCurrencyDisplay(data.usd, true); const displayBalanceText = formatCurrencyDisplay(usdValue, true);

    const rightSide = isMarket 
        ? `<h4 class="font-bold text-[15px] text-white">${displayPriceText}</h4><p class="${pnlClass} font-mono-num text-[11px]">${pnlSign}${parseFloat(data.change).toFixed(2)}%</p>`
        : `<h4 class="font-bold text-[15px] text-white">${displayBalanceText}</h4><p class="text-gray-500 font-mono-num text-[11px]">${amount.toFixed(4)} ${coin.symbol}</p>`;

    const onClickAttr = isMarket ? `onclick="changeChart('${coin.tvSymbol}')" class="cursor-pointer"` : ``;
    return `<div ${onClickAttr} class="bg-[#141419] p-4 rounded-2xl flex justify-between items-center border border-gray-800/50 ${isMarket?'hover:bg-gray-800 transition':''}"><div class="flex items-center gap-4"><img src="${coin.img}" class="coin-logo" onerror="this.onerror=null;this.src='https://ui-avatars.com/api/?name=${coin.symbol}&background=1a1a1a&color=fff';"><div><h4 class="font-bold text-[15px] text-white">${coin.symbol}</h4><p class="text-[11px] text-gray-400">${coin.name}</p></div></div><div class="text-right">${rightSide}</div></div>`;
}

// ============================================
// HISTORY & PIN VERIFICATION
// ============================================
function renderHistory() {
    const homeContainer = document.getElementById('homeHistoryList'); const fullContainer = document.getElementById('fullHistoryList');
    const history = appState.history || [];
    const emptyHtml = `<p class="text-xs text-gray-500 text-center py-4 bg-gray-900/50 rounded-xl">Belum ada transaksi.</p>`;
    const mapHistory = (tx) => {
        const sign = tx.type === 'Send' ? '-' : '+'; const formattedAmount = formatCurrencyDisplay(tx.usdAmount, true);
        return `
        <div onclick="showTxDetail('${tx.id}')" class="bg-[#141419] p-3 rounded-xl border border-gray-800/50 flex justify-between items-center cursor-pointer hover:bg-gray-800 transition">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full ${tx.type==='Send'?'bg-red-500/10 text-red-400':'bg-green-500/10 text-green-400'} flex items-center justify-center text-lg border border-gray-800"><i class="fa-solid ${tx.type==='Send'?'fa-arrow-up':'fa-arrow-down'}"></i></div>
                <div><p class="text-[14px] font-bold text-white">${tx.title}</p><p class="text-[10px] text-gray-500 font-mono">${tx.date.split(',')[0]}</p></div>
            </div>
            <p class="text-[14px] font-bold font-mono-num ${tx.type==='Send'?'text-white':'text-green-400'}">${sign}${formattedAmount}</p>
        </div>`;
    };
    if(homeContainer) homeContainer.innerHTML = history.length ? history.slice(0, 3).map(mapHistory).join('') : emptyHtml;
    if(fullContainer) fullContainer.innerHTML = history.length ? history.map(mapHistory).join('') : emptyHtml;
}

function showTxDetail(txid) {
    const tx = appState.history.find(t => t.id === txid); if(!tx) return;
    document.getElementById('txDetailAmount').innerText = formatCurrencyDisplay(tx.usdAmount, true);
    document.getElementById('txDetailTitle').innerText = tx.title; document.getElementById('txDetailDate').innerText = tx.date; document.getElementById('txDetailHash').innerText = tx.id;
    const iconEl = document.getElementById('txDetailIcon');
    if(tx.type === 'Send') { iconEl.className = "w-16 h-16 rounded-full mx-auto flex items-center justify-center text-3xl mb-4 border-2 border-red-500/30 bg-red-500/10 text-red-400"; iconEl.innerHTML = '<i class="fa-solid fa-arrow-up"></i>'; } 
    else { iconEl.className = "w-16 h-16 rounded-full mx-auto flex items-center justify-center text-3xl mb-4 border-2 border-green-500/30 bg-green-500/10 text-green-400"; iconEl.innerHTML = '<i class="fa-solid fa-arrow-down"></i>'; }
    toggleModal('txDetailModal');
}

function addTransaction(title, usdAmount, type) {
    if(!appState.history) appState.history = [];
    const txid = "0x" + Math.random().toString(16).substr(2, 64).toUpperCase();
    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' });
    appState.history.unshift({ title, usdAmount, type, id: txid, date: dateStr });
    saveData(); renderHistory();
}

let actionEnteredPin = ""; let pendingCallback = null;
function showActionPin(callback) { pendingCallback = callback; clearActionPin(); toggleModal('actionPinModal'); }
function enterActionPin(num) { if(actionEnteredPin.length < 6) { actionEnteredPin += num; updateActionPinUI(); } if(actionEnteredPin.length === 6) verifyActionPin(); }
function deleteActionPin() { actionEnteredPin = actionEnteredPin.slice(0, -1); updateActionPinUI(); }
function clearActionPin() { actionEnteredPin = ""; updateActionPinUI(); }
function updateActionPinUI() {
    document.querySelectorAll('.action-dot').forEach((dot, idx) => {
        if(idx < actionEnteredPin.length) { dot.classList.add('bg-cyan-400', 'border-cyan-400', 'shadow-[0_0_10px_#00f2fe]'); dot.classList.remove('bg-gray-800', 'border-gray-600'); } 
        else { dot.classList.remove('bg-cyan-400', 'border-cyan-400', 'shadow-[0_0_10px_#00f2fe]'); dot.classList.add('bg-gray-800', 'border-gray-600'); }
    });
}
function verifyActionPin() {
    if(actionEnteredPin === CORRECT_PIN) { toggleModal('actionPinModal'); showToast("Verifikasi Berhasil ✅"); if(pendingCallback) setTimeout(pendingCallback, 500); pendingCallback = null; } 
    else { showToast("PIN Salah! Transaksi Dibatalkan."); clearActionPin(); }
}

function handleAction(type) {
    const body = document.getElementById('actionBody'); const curr = appState.baseCurrency || 'USD';
    if(type==='send') body.innerHTML = `<input type="text" placeholder="Wallet Address" class="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 mb-3 text-white"><input type="number" id="sendAmt" placeholder="Nominal (${curr})" class="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white mb-4"><button onclick="executeSend()" class="w-full bg-blue-600 text-white font-bold py-3 rounded-xl">Kirim Crypto</button>`;
    else if(type==='receive') body.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=0xVIPAddress" class="mx-auto rounded-xl mb-3"><p class="text-gray-400 font-mono bg-gray-900 p-2 break-all">0xVIPWalletAddress098124509124</p>`;
    else if(type==='topup') body.innerHTML = `<input type="number" id="topupAmt" placeholder="Nominal (${curr})" class="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white mb-4"><button onclick="executeTopUp()" class="w-full bg-green-600 text-white font-bold py-3 rounded-xl">Top Up Saldo</button>`;
    toggleModal('actionModal');
}

function executeSend() { 
    const amt = parseFloat(document.getElementById('sendAmt').value); 
    if(amt>0) {
        const usdAmt = convertInputToUSD(amt);
        if(appState.totalBalance >= usdAmt) { toggleModal('actionModal'); showActionPin(() => { appState.totalBalance -= usdAmt; addTransaction("Kirim Crypto", usdAmt, "Send"); renderHomeAssets(); showToast("Transfer Sukses!"); }); } 
        else { showToast("Saldo Tidak Cukup!"); }
    }
}
function executeTopUp() { 
    const amt = parseFloat(document.getElementById('topupAmt').value); 
    if(amt>0) { const usdAmt = convertInputToUSD(amt); toggleModal('actionModal'); showActionPin(() => { appState.totalBalance += usdAmt; addTransaction("Deposit Saldo", usdAmt, "Receive"); renderHomeAssets(); showToast(`Top Up Sukses!`); }); } 
}
function scanQRIS() {
    showToast("Membuka Kamera..."); const curr = appState.baseCurrency || 'USD';
    setTimeout(() => {
        const amt = prompt(`QRIS Terdeteksi! Masukkan nominal pembayaran (${curr}):`);
        if(amt && !isNaN(amt)) {
            const usdAmt = convertInputToUSD(parseFloat(amt));
            if(appState.totalBalance >= usdAmt) { showActionPin(() => { appState.totalBalance -= usdAmt; addTransaction("Pembayaran QRIS", usdAmt, "Send"); renderHomeAssets(); showToast("Pembayaran QRIS Sukses!"); }); } 
            else { showToast("Saldo Tidak Cukup!"); }
        }
    }, 1000);
}

// ============================================
// SYSTEM BOOT & UTILITIES
// ============================================
function loadSaveData() {
    const saved = localStorage.getItem('mna_vip_wallet');
    if (saved) { let parsed = JSON.parse(saved); if(parsed.history) { parsed.history = parsed.history.map(tx => ({...tx, usdAmount: tx.usdAmount || tx.amount})); } appState = { ...appState, ...parsed }; }
    initFallbackPrices(); updateProfileImages(); updateUsernameUI(); 
    renderHomeAssets(); renderMarketAssets(); renderHistory(); fetchLivePrices(); fetchCryptoNews();
}

function saveData() { localStorage.setItem('mna_vip_wallet', JSON.stringify(appState)); }
function updateUsernameUI() {
    const headEl = document.getElementById('headerUsername'); const modEl = document.getElementById('modalUsername'); const pinEl = document.getElementById('pinUsername');
    if (headEl) headEl.innerText = appState.username; if (modEl) modEl.innerText = appState.username; if (pinEl) pinEl.innerText = `Welcome Back, ${appState.username.split(' ')[0]}`;
}
function editUsername() {
    const newName = prompt("Masukkan Username Baru:", appState.username);
    if (newName && newName.trim() !== "") { appState.username = newName.trim(); saveData(); updateUsernameUI(); showToast("Username Berhasil Diganti!"); }
}

function changeChart(symbol) {
    if (typeof TradingView === 'undefined') return; document.getElementById('tradingview_mna').innerHTML = '';
    new TradingView.widget({ "autosize": true, "symbol": symbol, "interval": "60", "theme": "dark", "style": "1", "hide_top_toolbar": true, "hide_legend": true, "container_id": "tradingview_mna", "backgroundColor": "rgba(10, 10, 12, 0)", "gridColor": "rgba(255, 255, 255, 0.05)" });
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
function updateProfileImages() { ['pinProfileImg', 'headerProfileImg', 'modalProfileImg'].forEach(id => { const el = document.getElementById(id); if (el) el.src = appState.profilePic; }); }
document.getElementById('profileUpload').addEventListener('change', function(event) { const file = event.target.files[0]; if (file) { const reader = new FileReader(); reader.onload = function(e) { appState.profilePic = e.target.result; updateProfileImages(); saveData(); showToast("Foto Profil Disimpan!"); }; reader.readAsDataURL(file); }});

function showPinScreen() { const ps = document.getElementById('pin-screen'); ps.classList.remove('hidden'); setTimeout(() => ps.classList.remove('opacity-0'), 50); }
function enterPin(num) { if (enteredPin.length < 6) { enteredPin += num; updatePinUI(); } if (enteredPin.length === 6) verifyPin(); }
function deletePin() { enteredPin = enteredPin.slice(0, -1); updatePinUI(); }
function clearPin() { enteredPin = ""; updatePinUI(); }
function updatePinUI() { document.querySelectorAll('.pin-dot').forEach((dot, idx) => { idx < enteredPin.length ? dot.classList.add('filled') : dot.classList.remove('filled'); }); }
function verifyPin() {
    if (enteredPin === CORRECT_PIN) {
        document.getElementById('pin-screen').classList.add('opacity-0');
        setTimeout(() => { document.getElementById('pin-screen').classList.add('hidden'); document.getElementById('main-app').classList.remove('hidden'); document.getElementById('main-app').classList.add('animate-fade'); changeChart("BINANCE:BTCUSDT"); showToast("Akses Diterima"); }, 500);
    } else { showToast("PIN Salah!"); clearPin(); }
}

function navSwitch(pageId) {
    document.querySelectorAll('.page-view').forEach(p => p.classList.add('hidden'));
    document.querySelectorAll('.nav-btn').forEach(b => { b.classList.remove('text-cyan-400'); if(!b.classList.contains('bg-gradient-to-r')) b.classList.add('text-gray-500'); });
    document.getElementById(`page-${pageId}`).classList.remove('hidden');
    if(pageId !== 'swap') { document.getElementById(`nav-${pageId}`).classList.remove('text-gray-500'); document.getElementById(`nav-${pageId}`).classList.add('text-cyan-400'); }
}

function executeSwap() { showToast("Swap Diproses"); setTimeout(()=>navSwitch('home'), 1500); }
function triggerCheatSystem() { if(prompt("Kode Akses:")==="MNA2026") { const bal = prompt("Saldo USD Baru:"); if(bal) { appState.totalBalance = parseFloat(bal); saveData(); renderHomeAssets(); showToast("Saldo Diperbarui"); } } }
function toggleModal(id) { const m = document.getElementById(id); if (!m) return; if(m.classList.contains('modal-active')) { m.classList.remove('modal-active'); setTimeout(()=>m.style.display='none',300); } else { m.style.display='block'; setTimeout(()=>m.classList.add('modal-active'),10); } }
function showToast(msg) { const container = document.getElementById('toast-container'); const toast = document.createElement('div'); toast.className = 'bg-gray-800 text-white px-6 py-3 rounded-full shadow-lg border border-gray-700 text-sm font-semibold toast-enter flex items-center gap-3 z-[99999]'; toast.innerHTML = `<i class="fa-solid fa-bell text-blue-400"></i> ${msg}`; container.appendChild(toast); setTimeout(() => { toast.style.opacity='0'; setTimeout(()=>toast.remove(),500); }, 3000); }

document.addEventListener('DOMContentLoaded', () => {
    loadSaveData();
    setTimeout(() => { document.getElementById('splash-screen').style.opacity = '0'; setTimeout(() => { document.getElementById('splash-screen').style.display = 'none'; showPinScreen(); }, 800); }, 1500);
});
setInterval(fetchLivePrices, 20000);
setInterval(fetchCryptoNews, 60000);

