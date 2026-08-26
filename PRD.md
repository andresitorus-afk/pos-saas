# POS-SaaS - Product Requirements Document

## Overview
Aplikasi Point of Sale (POS) berbasis web untuk manajemen transaksi penjualan toko.

## Environment
- **Development**: Laragon + MySQL 8.4 (localhost)
- **Production**: Vercel (hosting) + PlanetScale (MySQL cloud)
- **OS**: Windows

## Tech Stack

| Komponen       | Teknologi                        |
|----------------|----------------------------------|
| Framework      | Next.js 15 (App Router)          |
| Language       | TypeScript                        |
| ORM            | Prisma                            |
| Database       | MySQL 8.4 (local) / PlanetScale (prod) |
| Auth           | NextAuth.js (credentials)         |
| UI             | Tailwind CSS                      |
| cetak struk    | Browser Print API (thermal 80mm)  |

## Database Schema

### User
| Field    | Type         | Note                    |
|----------|--------------|-------------------------|
| id       | Int          | PK, autoincrement       |
| name     | Varchar(100) |                         |
| email    | Varchar(100) | unique                  |
| password | Varchar(255) | hashed (bcrypt)         |
| role     | Enum         | ADMIN, KASIR            |
| createdAt| DateTime     | default now()           |

### Kategori
| Field    | Type         | Note                    |
|----------|--------------|-------------------------|
| id       | Int          | PK, autoincrement       |
| nama     | Varchar(100) | unique                  |
| createdAt| DateTime     | default now()           |

### Produk
| Field      | Type         | Note                    |
|------------|--------------|-------------------------|
| id         | Int          | PK, autoincrement       |
| nama       | Varchar(200) |                         |
| barcode    | Varchar(50)  | unique, nullable        |
| harga      | Decimal(12,2)|                         |
| stok       | Int          | default 0               |
| kategoriId | Int          | FK -> Kategori          |
| gambar     | Varchar(500) | nullable, URL/path      |
| createdAt  | DateTime     | default now()           |

### Transaksi
| Field      | Type         | Note                    |
|------------|--------------|-------------------------|
| id         | Int          | PK, autoincrement       |
| userId     | Int          | FK -> User              |
| total      | Decimal(12,2)|                         |
| bayar      | Decimal(12,2)| jumlah uang diterima    |
| kembalian  | Decimal(12,2)| bayar - total           |
| createdAt  | DateTime     | default now()           |

### DetailTransaksi
| Field        | Type         | Note                    |
|--------------|--------------|-------------------------|
| id           | Int          | PK, autoincrement       |
| transaksiId  | Int          | FK -> Transaksi         |
| produkId     | Int          | FK -> Produk            |
| jumlah       | Int          |                         |
| subtotal     | Decimal(12,2)| jumlah * harga          |

### Setting
| Field    | Type         | Note                    |
|----------|--------------|-------------------------|
| id       | Int          | PK, autoincrement       |
| namaToko | Varchar(200) |                         |
| alamat   | Text         |                         |
| noTelp   | Varchar(20)  |                         |
| footer   | Text         | pesanan di bawah struk  |

## Fitur

### 1. Authentication (Login)
- Login via email + password
- Session management via NextAuth.js
- Role-based: ADMIN (full akses) dan KASIR (hanya transaksi)
- Halaman login terpisah, redirect ke dashboard setelah login

### 2. Dashboard
- Total penjualan hari ini (rupiah)
- Jumlah transaksi hari ini
- Produk terlaris (top 5)
- Grafik penjualan 7 hari terakhir (opsional)

### 3. Manajemen Produk
- **List**: Tabel produk dengan search, filter kategori, pagination
- **Tambah**: Form nama, barcode (auto generate), harga, stok, kategori, gambar
- **Edit**: Edit semua field produk
- **Hapus**: Konfirmasi hapus produk
- **Kategori**: CRUD kategori produk (dropdown di form produk)

### 4. Transaksi (POS)
- **Tampilan split**: Kiri = grid/list produk, Kanan = keranjang
- **Pilih produk**: Klik produk -> masuk keranjang
- **Keranjang**: Ubah jumlah (+/-), hapus item, subtotal per item
- **Total**: Auto hitung total belanja
- **Bayar**: Input jumlah bayar, auto hitung kembalian
- **Simpan**: Insert transaksi + detail, kurangi stok produk
- **Cetak**: Otomatis cetak struk setelah transaksi berhasil

### 5. Cetak Struk (Thermal 80mm)
Format struk:
```
================================
        NAMA TOKO
      Alamat Toko
     Telp: 08xxx
================================
No: TRX-0001
Date: 26/08/2026 11:30
Kasir: Admin
--------------------------------
Indomie Goreng    2x  3.500
Aqua 600ml        3x  4.500
--------------------------------
TOTAL            :   14.500
BAYAR            :   20.000
KEMBALIAN         :    5.500
================================
  Terima kasih atas kunjungan
         Anda!
================================
```
- Cetak via `window.print()` dengan CSS print media
- Format fixed-width untuk thermal printer 80mm

### 6. Laporan Penjualan
- Filter tanggal (dari - sampai)
- Tabel transaksi: No, Tanggal, Kasir, Total
- Ringkasan: Total penjualan, jumlah transaksi, rata-rata/transaksi
- Export (opsional, bisa ditambah nanti)

### 7. Manajemen User (Admin Only)
- **List**: Tabel user dengan role
- **Tambah**: Form nama, email, password, role
- **Edit**: Edit nama, email, role (password opsional)
- **Hapus**: Konfirmasi hapus, tidak bisa hapus diri sendiri

### 8. Settings (Admin Only)
- Edit nama toko, alamat, no. telepon, footer struk
- Tersimpan di tabel Setting (single row)

## Route Structure

```
/login                          → Halaman Login
/(dashboard)/                   → Dashboard (redirect dari /)
/(dashboard)/produk             → List Produk
/(dashboard)/produk/tambah      → Form Tambah Produk
/(dashboard)/produk/edit/[id]   → Form Edit Produk
/(dashboard)/transaksi          → POS / Keranjang
/(dashboard)/laporan            → Laporan Penjualan
/(dashboard)/user               → Manajemen User (admin)
/(dashboard)/settings           → Pengaturan Toko (admin)

/api/auth/[...nextauth]         → NextAuth handler
/api/produk                     → GET, POST produk
/api/produk/[id]                → GET, PUT, DELETE produk
/api/kategori                   → GET, POST kategori
/api/kategori/[id]              → PUT, DELETE kategori
/api/transaksi                  → POST transaksi
/api/transaksi/[id]             → GET detail transaksi
/api/laporan                    → GET laporan (query tanggal)
/api/user                       → GET, POST user (admin)
/api/user/[id]                  → PUT, DELETE user (admin)
/api/setting                    → GET, PUT setting
```

## Dependencies

```json
{
  "dependencies": {
    "next": "^15.x",
    "react": "^19.x",
    "react-dom": "^19.x",
    "next-auth": "^5.x",
    "@prisma/client": "^6.x",
    "bcryptjs": "^2.x",
    "date-fns": "^4.x"
  },
  "devDependencies": {
    "typescript": "^5.x",
    "@types/node": "^22.x",
    "@types/react": "^19.x",
    "@types/bcryptjs": "^2.x",
    "prisma": "^6.x",
    "tailwindcss": "^4.x",
    "@tailwindcss/postcss": "^4.x"
  }
}
```

## Deployment Strategy

### Development (Lokal)
- Laragon (Apache + MySQL 8.4)
- `npm run dev` → http://localhost:3000
- Database: MySQL lokal via Laragon

### Production (Nanti, saat ada klien)
1. Push code ke GitHub repository
2. Import ke Vercel → auto-detect Next.js
3. Buat database di PlanetScale (MySQL compatible)
4. Set environment variables di Vercel:
   - DATABASE_URL (PlanetScale connection string)
   - NEXTAUTH_SECRET
   - NEXTAUTH_URL (domain production)
5. Run Prisma migration di PlanetScale
6. Deploy otomatis setiap push ke main branch

### Environment Variables

```env
# .env.local (development)
DATABASE_URL="mysql://root:@localhost:3306/pos_saas"
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"

# .env.production (Vercel)
DATABASE_URL="mysql://xxx@xxx planetscale db url"
NEXTAUTH_SECRET="production-secret"
NEXTAUTH_URL="https://pos-saas.vercel.app"
```

## Seed Data

Default data setelah migrasi:
- **Admin user**: admin@pos.com / password123 (role: ADMIN)
- **Kasir user**: kasir@pos.com / password123 (role: KASIR)
- **Kategori**: Makanan, Minuman, Snack, Kebersihan, Lainnya
- **Produk contoh**: Indomie, Aqua, Pop Mie, dll (10-15 produk)
- **Setting default**: Nama Toko, Alamat, NoTelp
