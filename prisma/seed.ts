import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Hash password
  const password = await bcrypt.hash("password123", 10);

  // Users
  await prisma.user.upsert({
    where: { email: "admin@pos.com" },
    update: {},
    create: {
      name: "Admin",
      email: "admin@pos.com",
      password,
      role: "ADMIN",
    },
  });

  await prisma.user.upsert({
    where: { email: "kasir@pos.com" },
    update: {},
    create: {
      name: "Kasir",
      email: "kasir@pos.com",
      password,
      role: "KASIR",
    },
  });

  // Kategori
  const kategoriData = ["Makanan", "Minuman", "Snack", "Kebersihan", "Lainnya"];
  const kategoris: Record<string, number> = {};

  for (const nama of kategoriData) {
    const k = await prisma.kategori.upsert({
      where: { nama },
      update: {},
      create: { nama },
    });
    kategoris[nama] = k.id;
  }

  // Produk
  const produkData = [
    { nama: "Indomie Goreng", harga: 3500, stok: 100, kategori: "Makanan" },
    { nama: "Indomie Kuah Soto", harga: 3500, stok: 80, kategori: "Makanan" },
    { nama: "Pop Mie", harga: 5000, stok: 50, kategori: "Makanan" },
    { nama: "Nasi Putih", harga: 4000, stok: 200, kategori: "Makanan" },
    { nama: "Aqua 600ml", harga: 4000, stok: 120, kategori: "Minuman" },
    { nama: "Aqua 1500ml", harga: 8000, stok: 60, kategori: "Minuman" },
    { nama: "Coca Cola 390ml", harga: 7000, stok: 48, kategori: "Minuman" },
    { nama: "Teh Pucuk 350ml", harga: 4000, stok: 72, kategori: "Minuman" },
    { nama: "Chitato 68g", harga: 12000, stok: 30, kategori: "Snack" },
    { nama: "Lays 68g", harga: 12000, stok: 25, kategori: "Snack" },
    { nama: "Oreo 137g", harga: 8500, stok: 40, kategori: "Snack" },
    { nama: "Roma Malkist 135g", harga: 7000, stok: 35, kategori: "Snack" },
    { nama: "Rinso 780g", harga: 18000, stok: 20, kategori: "Kebersihan" },
    { nama: "Lifebuoy Sabun", harga: 4500, stok: 60, kategori: "Kebersihan" },
    { nama: "Baygon", harga: 32000, stok: 15, kategori: "Kebersihan" },
  ];

  for (const p of produkData) {
    await prisma.produk.create({
      data: {
        nama: p.nama,
        harga: p.harga,
        stok: p.stok,
        kategoriId: kategoris[p.kategori],
      },
    });
  }

  // Setting default
  await prisma.setting.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      namaToko: "Toko Saya",
      alamat: "Jl. Contoh No. 123, Kota",
      noTelp: "081234567890",
      footer: "Terima kasih atas kunjungan Anda!",
    },
  });

  console.log("Seed data berhasil ditambahkan!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
