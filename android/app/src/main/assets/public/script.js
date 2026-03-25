// Data koin simulasi (MNA Wallet Sultan)
let myAssets = {
    bitcoin: 0.15, 
    ethereum: 2.5,
    tether: 500
};

// Fungsi ambil harga asli pasar dunia (CoinGecko)
async function updateMarketData() {
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,tether&vs_currencies=idr&include_24hr_change=true');
        const data = await response.json();
        
        // Hitung total saldo
        let totalVal = (myAssets.bitcoin * data.bitcoin.idr) + 
                       (myAssets.ethereum * data.ethereum.idr) + 
                       (myAssets.tether * data.tether.idr);
        
        document.getElementById('totalBalance').innerText = "Rp " + totalVal.toLocaleString('id-ID');

        // Hitung PNL (Profit/Loss 24 jam)
        let avgChange = (data.bitcoin.idr_24h_change + data.ethereum.idr_24h_change) / 2;
        const pnlBox = document.getElementById('pnlBox');
        pnlBox.innerText = `PNL (24h): ${avgChange >= 0 ? '+' : ''}${avgChange.toFixed(2)}%`;
        pnlBox.style.background = avgChange >= 0 ? 'rgba(0, 255, 0, 0.2)' : 'rgba(255, 0, 0, 0.2)';
        pnlBox.style.color = avgChange >= 0 ? '#00ff00' : '#ff4444';

    } catch (e) {
        console.log("Koneksi gagal.");
        document.getElementById('pnlBox').innerText = "Offline Mode";
    }
}

// Fitur Riwayat & TXID
function renderHistory() {
    const logs = JSON.parse(localStorage.getItem('mna_tx_logs')) || [];
    const container = document.getElementById('historyList');
    container.innerHTML = logs.length ? "" : "<p style='color:#666'>Belum ada transaksi.</p>";
    
    logs.forEach(tx => {
        container.innerHTML += `
            <div class="history-item">
                <div class="tx-info">
                    <span class="tx-type">${tx.type}</span>
                    <span class="tx-id">Hash: ${tx.id}</span>
                </div>
                <div class="tx-amount">${tx.amount}</div>
            </div>
        `;
    });
}

function simulateTransfer(type) {
    let val = prompt(`Masukkan nominal untuk ${type} (Contoh: Rp 1.500.000):`);
    if(val) {
        let txHash = "0x" + Math.random().toString(16).substr(2, 12).toUpperCase() + "...";
        let logs = JSON.parse(localStorage.getItem('mna_tx_logs')) || [];
        logs.unshift({ type: type, amount: val, id: txHash });
        localStorage.setItem('mna_tx_logs', JSON.stringify(logs));
        renderHistory();
        alert(`Sukses! ID Transaksi: ${txHash}`);
    }
}

function scanQRIS() {
    alert("Membuka Kamera... Memindai QRIS");
    setTimeout(() => {
        let nominal = prompt("QRIS Terdeteksi! Masukkan nominal pembayaran:");
        if(nominal) simulateTransfer("Bayar QRIS Rp " + nominal);
    }, 1200);
}

// Jalankan otomatis saat aplikasi dibuka
updateMarketData();
setInterval(updateMarketData, 20000); // Update harga tiap 20 detik
renderHistory();

