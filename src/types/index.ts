export interface User {
  id: number;
  name: string;
  email: string;
  role: "ADMIN" | "KASIR";
}

export interface Kategori {
  id: number;
  nama: string;
}

export interface Produk {
  id: number;
  nama: string;
  barcode: string | null;
  harga: number;
  stok: number;
  kategoriId: number;
  gambar: string | null;
  kategori?: Kategori;
}

export interface Transaksi {
  id: number;
  userId: number;
  total: number;
  bayar: number;
  kembalian: number;
  createdAt: string;
  user?: User;
  detailTransaksis?: DetailTransaksi[];
}

export interface DetailTransaksi {
  id: number;
  transaksiId: number;
  produkId: number;
  jumlah: number;
  subtotal: number;
  produk?: Produk;
}

export interface CartItem {
  produk: Produk;
  jumlah: number;
}

export interface Setting {
  id: number;
  namaToko: string;
  alamat: string;
  noTelp: string;
  footer: string;
}
