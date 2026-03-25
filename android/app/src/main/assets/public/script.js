// Simulasi jumlah koin yang kamu punya
let myCoins = {
    bitcoin: 0.05, // Punya 0.05 BTC
    ethereum: 1.2  // Punya 1.2 ETH
};

// Fungsi menarik harga asli dari CoinGecko
async function fetchRealPrices() {
    try {
        let response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=idr&include_24hr_change=true');
        let data = await response.json();
        
        let btcPrice = data.bitcoin.idr;
        let ethPrice = data.ethereum.idr;
        
        // Hitung total saldo dalam Rupiah
        let totalIDR = (myCoins.bitcoin * btcPrice) + (myCoins.ethereum * ethPrice);
        document.getElementById('totalBalance').innerText = "Rp " + totalIDR.toLocaleString('id-ID');

        // Hitung rata-rata PNL (24 jam)
        let avgPNL = (data.bitcoin.idr_24h_change + data.ethereum.idr_24h_change) / 2;
        let pnlText = document.getElementById('pnlDisplay');
        pnlText.innerText = `PNL (24h): ${avgPNL > 0 ? '+' : ''}${avgPNL.toFixed(2)}%`;
        pnlText.style.color = avgPNL > 0 ? '#00ff00' : '#ff0000'; // Hijau jika untung, merah jika rugi

    } catch (error) {
        document.getElementById('totalBalance').innerText = "Gagal memuat harga";
    }
}

// Fitur Riwayat Transaksi dengan TX ID
function loadHistory() {
    let history = JSON.parse(localStorage.getItem('mna_history')) || [];
    let list = document.getElementById('historyList');
    list.innerHTML = "";
    history.forEach(tx => {
        list.innerHTML += `<li><b>${tx.type}</b>: ${tx.amount} <br><small>TXID: ${tx.id}</small></li>`;
    });
}

function simulateTransfer(type) {
    let amount = prompt(`Masukkan jumlah yang ingin di-${type} (Contoh: Rp 500.000):`);
    if(amount) {
        let txid = "0x" + Math.random().toString(16).substr(2, 10).toUpperCase(); // Bikin TX ID acak
        let history = JSON.parse(localStorage.getItem('mna_history')) || [];
        history.unshift({ type: type, amount: amount, id: txid }); // Tambah ke riwayat atas
        localStorage.setItem('mna_history', JSON.stringify(history));
        alert(`Sukses! TX ID Anda: ${txid}`);
        loadHistory();
    }
}

// Fitur Scan QRIS (Simulasi Kamera)
function scanQRIS() {
    alert("Kamera terbuka... (Memindai QRIS)");
    setTimeout(() => {
        let payAmount = prompt("QRIS Terdeteksi! Masukkan nominal pembayaran:");
        if(payAmount) {
            simulateTransfer(`Bayar QRIS Rp ${payAmount}`);
        }
    }, 1500);
}

// Jalankan saat aplikasi dibuka
fetchRealPrices();
setInterval(fetchRealPrices, 30000); // Update harga tiap 30 detik
loadHistory();

