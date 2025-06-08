# Shopee Data Extractor Chrome Extension

A Chrome extension built with Plasmo that extracts campaign data from Shopee Seller Center and sends it to Google Sheets via SheetDB.

## Features

- 🔐 Automatically extracts cookies and authentication tokens from Shopee tabs
- 📊 Fetches campaign data from Shopee Ads API
- 📈 Sends data directly to Google Sheets via SheetDB
- 🎯 Filter campaigns by type, state, and date range
- 💾 Saves SheetDB configuration locally
- 📥 Download data as CSV file with ALL fields
- 🔄 Comprehensive data export without any data loss
- 📑 Support for multiple sheets/tabs in Google Sheets

## Prerequisites

1. **SheetDB Account**

   - Go to [SheetDB.io](https://sheetdb.io/)
   - Create a free account
   - Connect your Google Sheet
   - Get your API URL (e.g., `https://sheetdb.io/api/v1/your-api-id`)

2. **Google Sheets Setup**

   - Create a new Google Sheet
   - **IMPORTANT**: In row 1, add these exact headers:

   **Mode Simple (9 kolom)**:

   ```
   nama_toko | campaign_id | nama_iklan | status | jenis_iklan | tampilan_iklan | jumlah_klik | biaya | tanggal_ekstrak
   ```

   **Mode Complete (36 kolom) - Sesuai kebutuhan Anda**:

   ```
   nama_toko | campaign_id | nama_iklan | status | jenis_iklan | kode_produk | tagline_toko | modal_harian | total_budget | tampilan_iklan | mode_bidding | penempatan_iklan | tanggal_mulai | tanggal_selesai | dilihat | jumlah_klik | persentase_klik | konversi | konversi_langsung | tingkat_konversi | tingkat_konversi_langsung | biaya_per_konversi | biaya_per_konversi_langsung | produk_terjual | terjual_langsung | omzet_penjualan | penjualan_langsung_gmv_langsung | biaya | efektifitas_iklan | efektivitas_langsung | persentase_biaya_iklan_terhadap_penjualan_dari_iklan_acos | persentase_biaya_iklan_terhadap_penjualan_dari_iklan_langsung_acos_langsung | jumlah_produk_dilihat | jumlah_klik_produk | persentase_klik_produk | tanggal_ekstrak
   ```

   **PENTING**:

   - Headers harus persis sama (huruf kecil, dengan underscore)
   - Jangan gunakan spasi, gunakan underscore (\_)
   - Headers harus di baris 1
   - Share the sheet with SheetDB (follow SheetDB instructions)
   - You can create multiple sheets/tabs with the same headers

## Installation

1. Clone this repository
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Run in development mode:

```bash
pnpm dev
```

4. Or build for production:

```bash
pnpm build
```

## Usage

1. **Login to Shopee Seller Center**

   - Open https://seller.shopee.co.id/
   - Login with your credentials

2. **Configure the Extension**

   - Click on the extension icon
   - **Enter your shop name** (akan ditambahkan di setiap baris data)
   - Enter your SheetDB API URL
   - (Optional) Enter the sheet/tab name if you want to use a specific sheet
   - Click "Save Configuration"

3. **Fetch Campaign Data**

   - Select date range (Today, Yesterday, Last 7/14/30 days)
   - Choose campaign type (or "All Campaign Types")
   - Select campaign state (or "All States")
   - Set results per page (max 50)
   - Toggle "Auto-fetch all pages" for pagination
   - **Choose Update Mode**:
     - **Tambah Data Baru**: Menambah data di baris baru (untuk tracking history)
     - **Ganti Semua Data**: Hapus data lama, ganti dengan yang baru
   - Click "Fetch Shopee Data"

4. **View Results**
   - Data will be automatically sent to your Google Sheet via SheetDB
   - Or click "Download CSV" to get a local copy with ALL fields

## SheetDB Setup Guide

1. **Create SheetDB Account**

   - Visit [https://sheetdb.io/](https://sheetdb.io/)
   - Sign up for free (500 requests/month)

2. **Connect Your Google Sheet**

   - Click "Create New API"
   - Authorize Google Sheets access
   - Select your spreadsheet
   - Copy the API URL provided

3. **Configure Headers**

   - Your Google Sheet MUST have these exact headers in row 1:
     - `campaign_id` (no spaces, lowercase)
     - `title` (no spaces, lowercase)
     - `type` (no spaces, lowercase)
     - `state` (no spaces, lowercase)
     - `impressions` (no spaces, lowercase)
     - `clicks` (no spaces, lowercase)

   **Critical**:

   - Headers must be exactly as shown (case-sensitive)
   - No spaces in header names
   - Must be in row 1 of your sheet

## Data Exported (Complete List)

Extension ini mengekspor data campaign Shopee dengan field-field berikut:

### Mode Simple (9 Field)

- `nama_toko`: Nama toko (dapat dikustomisasi di popup)
- `campaign_id`: ID unik campaign
- `nama_iklan`: Nama campaign/iklan
- `status`: Status iklan (Aktif/Dijeda/Selesai/Ditutup)
- `jenis_iklan`: Jenis campaign (Iklan Produk, Iklan Toko, dll)
- `tampilan_iklan`: Jumlah tayangan iklan
- `jumlah_klik`: Total klik yang diterima
- `biaya`: Total biaya iklan (dalam Rupiah)
- `tanggal_ekstrak`: Waktu data diambil (untuk tracking)

### Mode Complete (36 Field) - Sesuai Kebutuhan Anda

#### Informasi Dasar

- `nama_toko`: Nama toko (dapat dikustomisasi di popup)
- `campaign_id`: ID unik campaign
- `nama_iklan`: Nama campaign/iklan
- `status`: Status iklan (Aktif/Dijeda/Selesai/Ditutup)
- `jenis_iklan`: Jenis campaign
- `kode_produk`: ID/SKU produk yang diiklankan (kosong untuk iklan toko)
- `tagline_toko`: Tagline untuk iklan toko (kosong untuk iklan produk)

#### Pengaturan Iklan

- `modal_harian`: Budget harian campaign (dalam Rupiah)
- `total_budget`: Total budget campaign (dalam Rupiah)
- `tampilan_iklan`: Jumlah tayangan iklan
- `mode_bidding`: Mode bidding (manual/otomatis)
- `penempatan_iklan`: Lokasi penempatan iklan
- `tanggal_mulai`: Tanggal mulai campaign (DD/MM/YYYY)
- `tanggal_selesai`: Tanggal berakhir campaign (DD/MM/YYYY)

#### Metrik Performa

- `dilihat`: Total tayangan (sama dengan tampilan_iklan)
- `jumlah_klik`: Total klik
- `persentase_klik`: CTR dalam persen (%)
- `konversi`: Total konversi/pesanan
- `konversi_langsung`: Konversi langsung dari iklan
- `tingkat_konversi`: Conversion rate (%)
- `tingkat_konversi_langsung`: Direct conversion rate (%)

#### Metrik Biaya

- `biaya_per_konversi`: Biaya per konversi
- `biaya_per_konversi_langsung`: Biaya per konversi langsung
- `biaya`: Total biaya iklan

#### Metrik Penjualan

- `produk_terjual`: Total produk terjual
- `terjual_langsung`: Produk terjual langsung dari iklan
- `omzet_penjualan`: Total GMV/omzet
- `penjualan_langsung_gmv_langsung`: GMV langsung dari iklan

#### Metrik ROI

- `efektifitas_iklan`: ROI keseluruhan
- `efektivitas_langsung`: ROI langsung
- `persentase_biaya_iklan_terhadap_penjualan_dari_iklan_acos`: ACOS/CIR (%)
- `persentase_biaya_iklan_terhadap_penjualan_dari_iklan_langsung_acos_langsung`: Direct ACOS/CIR (%)

#### Metrik Produk

- `jumlah_produk_dilihat`: Tayangan produk
- `jumlah_klik_produk`: Klik pada produk
- `persentase_klik_produk`: CTR produk (%)

#### Tracking

- `tanggal_ekstrak`: Waktu data diambil (DD/MM/YYYY HH:mm:ss)

## Export Options

### SheetDB Export

- Automatically formats all data for spreadsheet viewing
- Batch inserts all campaigns at once
- Converts currency values from smallest unit
- Formats dates in ISO format

### CSV Download

- Exports ALL fields from the API response
- Flattens nested objects for complete data capture
- Automatically converts currency values
- Includes timestamp in filename

## Data Conversion

Extension secara otomatis menangani konversi data dengan format:

### Format Angka:

- **Mata Uang (Rupiah)**:

  - Format: Angka bulat tanpa desimal
  - **Semua nilai uang**: Dibagi 100.000
    - Cost: `12630683668` → `126307` (Rp 126.307)
    - GMV: `21430000000` → `214300` (Rp 214.300)
    - CPC: `1403409296` → `14034` (Rp 14.034)
  - Berlaku untuk: cost, broad_gmv, direct_gmv, cpc, cpdc, dll

- **Persentase/Rasio**:

  - Menggunakan koma (,) sebagai pemisah desimal
  - Data sudah dalam format desimal, hanya ganti titik dengan koma
  - CTR: `0.02921` → `0,02921` (artinya 2.921%)
  - CIR: `0.589392` → `0,589392` (artinya 58.9392%)
  - ROI: `1.6966` → `1,6966` (artinya ROI 1.6966x)
  - Berlaku untuk: ctr, cr, broad_cir, broad_roi, dll

- **Data Hitungan**:

  - Tidak dibagi, langsung digunakan
  - Impressions: `2088` → `2088`
  - Clicks: `61` → `61`
  - Orders: `9` → `9`
  - Berlaku untuk: impression, click, broad_order, dll

- **Tanggal**: Format DD/MM/YYYY

  - Contoh: `31/01/2025`

- **Status**: Diterjemahkan ke Bahasa Indonesia

  - ongoing → Aktif
  - paused → Dijeda
  - ended → Selesai
  - closed → Ditutup

- **Jenis Iklan**: Diterjemahkan ke Bahasa Indonesia
  - product_manual → Iklan Produk Manual
  - shop_manual → Iklan Toko Manual
  - product_homepage**roi_two**target → Iklan Produk ROI Target
  - dll.

## Pagination

- **Default limit**: 50 campaigns per page (Shopee's maximum)
- **Auto-fetch all pages**: Enabled by default
- If you have more than 50 campaigns, the extension will automatically fetch all pages
- Disable "Auto-fetch all pages" to get only the first page

## Security Notes

- Your SheetDB API URL is stored locally in Chrome's storage
- Cookies are only accessed from Shopee domains
- No data is sent to third-party servers (except SheetDB)
- All data processing happens locally in your browser

## Troubleshooting

1. **"Please open a Shopee seller tab first"**

   - Make sure you have https://seller.shopee.co.id/ open in a tab
   - Ensure you're logged in

2. **"SPC_CDS token not found"**

   - Clear cookies and login again to Shopee Seller Center
   - Make sure you're on the seller dashboard

3. **SheetDB API errors**

   - **"Bad data format"**:
     - Check console logs for the exact data being sent
     - Verify your Google Sheet headers match EXACTLY (case-sensitive, no spaces)
     - Make sure row 1 has headers: campaign_id, title, type, state, impressions, clicks
     - Try creating a fresh Google Sheet with correct headers
     - If using multiple sheets, make sure the sheet name is correct
   - **"404 Not Found"**:
     - Check if the sheet name is spelled correctly (case-sensitive)
     - Verify the sheet exists in your Google Sheets document
   - Verify your API URL is correct (should be like: https://sheetdb.io/api/v1/xxxxx)
   - Check your SheetDB quota (free tier: 500 requests/month)
   - Make sure the sheet is properly connected to SheetDB

4. **CSV Download issues**
   - Check Chrome's download settings
   - Ensure you have fetched data first before downloading

## Development

This extension is built with:

- [Plasmo Framework](https://docs.plasmo.com/)
- React 18
- TypeScript
- Chrome Extension Manifest V3
- SheetDB API

## License

MIT

## Menghindari Data Duplikat

Extension menyediakan beberapa cara untuk menghindari duplikasi data:

1. **Update Mode "Ganti Semua Data"**

   - Hapus semua data lama sebelum insert data baru
   - Cocok jika Anda hanya butuh data terkini

2. **Campaign ID & Tanggal Ekstrak**

   - Setiap baris memiliki `campaign_id` dan `tanggal_ekstrak`
   - Memudahkan untuk filter data duplikat di Google Sheets
   - Bisa track perubahan data campaign dari waktu ke waktu

3. **Tips Mengelola Data**:
   - Gunakan filter di Google Sheets berdasarkan `tanggal_ekstrak`
   - Buat pivot table untuk melihat data terbaru per campaign
   - Gunakan QUERY atau UNIQUE function untuk menghilangkan duplikat
   - Buat sheet terpisah untuk data historis vs data terkini

### Contoh Output Data (Berdasarkan Sample):

```
nama_toko   | campaign_id | nama_iklan                          | jenis_iklan        | kode_produk | tagline_toko                    | modal_harian | biaya
------------|-------------|-------------------------------------|--------------------|-------------|----------------------------------|--------------|--------
MyShop      | 320206516   | Akun envato elements...             | Iklan Produk Manual| 26785432933 |                                 | 150000       | 126307
MyShop      | 400909415   | GEMINI AI + DRIVE 2TB              | Iklan Toko Manual  |             | Gemini AI + 2TB Drive 15 Bulan | 25000        | 7448
```

**Penjelasan Konversi Modal Harian:**

- Daily Budget `15000000000` → dibagi 100.000 → `150000` (Rp 150.000)
- Daily Budget `25000000000` → dibagi 100.000 → `250000` (Rp 250.000)
- Daily Budget `5000000000` → dibagi 100.000 → `50000` (Rp 50.000)

### Format Khusus Iklan Toko

Iklan toko (`shop_manual`) memiliki struktur berbeda:

- Tidak memiliki `kode_produk` (item_id)
- Memiliki `tagline_toko` yang berisi pesan promosi toko
- Contoh: "Gemini AI + 2TB Drive 15 Bulan"
