# POS-SaaS

Aplikasi Point of Sale (POS) berbasis web untuk manajemen transaksi penjualan toko.

## Tech Stack

- Next.js 15 (App Router) + TypeScript
- Prisma ORM + MySQL 8.4
- NextAuth.js (credentials login)
- Tailwind CSS

## Setup (Development)

### Prerequisites
- Node.js 18+
- MySQL 8.x (via Laragon)

### Install

```bash
npm install
```

### Setup Database

```bash
# Buat database di MySQL (via Laragon atau CLI)
mysql -u root -e "CREATE DATABASE pos_saas"

# Set env
cp .env.example .env.local
# Edit .env.local isi DATABASE_URL

# Run migration
npx prisma migrate dev --name init

# Seed data
npx prisma db seed
```

### Run

```bash
npm run dev
```

Buka http://localhost:3000

### Default Login

| Email            | Password   | Role  |
|------------------|------------|-------|
| admin@pos.com    | password123| ADMIN |
| kasir@pos.com    | password123| KASIR |

## Project Structure

```
pos-saas/
├── prisma/
│   ├── schema.prisma        # Database schema
│   └── seed.ts              # Seed data
├── src/
│   ├── app/
│   │   ├── login/           # Halaman login
│   │   ├── (dashboard)/     # Dashboard routes
│   │   │   ├── page.tsx     # Dashboard home
│   │   │   ├── produk/      # CRUD Produk
│   │   │   ├── transaksi/   # POS / Keranjang
│   │   │   ├── laporan/     # Laporan penjualan
│   │   │   ├── user/        # Manajemen user
│   │   │   └── settings/    # Pengaturan toko
│   │   └── api/             # API routes
│   ├── components/          # Reusable components
│   ├── lib/                 # Utilities (prisma, auth)
│   └── types/               # TypeScript types
└── public/
```

## Deploy (Production)

Saat sudah ada klien:
1. Push ke GitHub
2. Import ke Vercel
3. Buat database di PlanetScale
4. Set environment variables
5. Deploy
