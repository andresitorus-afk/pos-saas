"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";

interface Produk {
  id: number;
  nama: string;
  barcode: string | null;
  harga: number;
  stok: number;
  kategoriId: number;
  kategori?: { nama: string };
}

export default function ProdukPage() {
  const { data: session } = useSession();
  const [produks, setProduks] = useState<Produk[]>([]);
  const [kategoris, setKategoris] = useState<{ id: number; nama: string }[]>([]);
  const [search, setSearch] = useState("");
  const [filterKategori, setFilterKategori] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [produkRes, kategoriRes] = await Promise.all([
        fetch("/api/produk"),
        fetch("/api/kategori"),
      ]);
      if (produkRes.ok) setProduks(await produkRes.json());
      if (kategoriRes.ok) setKategoris(await kategoriRes.json());
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Yakin hapus produk ini?")) return;

    const res = await fetch(`/api/produk/${id}`, { method: "DELETE" });
    const data = await res.json();

    if (res.ok) {
      setProduks(produks.filter((p) => p.id !== id));
    } else {
      alert(data.error || "Gagal hapus produk");
    }
  };

  const filtered = produks.filter((p) => {
    const matchSearch =
      !search ||
      p.nama.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode?.toLowerCase().includes(search.toLowerCase());
    const matchKategori = !filterKategori || p.kategoriId === Number(filterKategori);
    return matchSearch && matchKategori;
  });

  const isAdmin = session?.user?.role === "ADMIN";

  if (loading) {
    return <div className="text-center py-10 text-gray-500">Loading...</div>;
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Manajemen Produk</h1>
        {isAdmin && (
          <Link
            href="/produk/tambah"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Tambah Produk
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Cari nama atau barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filterKategori}
          onChange={(e) => setFilterKategori(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Semua Kategori</option>
          {kategoris.map((k) => (
            <option key={k.id} value={k.id}>
              {k.nama}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-left">
            <tr>
              <th className="px-4 py-3 font-semibold">Nama</th>
              <th className="px-4 py-3 font-semibold">Barcode</th>
              <th className="px-4 py-3 font-semibold">Kategori</th>
              <th className="px-4 py-3 font-semibold text-right">Harga</th>
              <th className="px-4 py-3 font-semibold text-right">Stok</th>
              {isAdmin && <th className="px-4 py-3 font-semibold text-right">Aksi</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  Tidak ada produk.
                </td>
              </tr>
            ) : (
              filtered.map((p) => (
                <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{p.nama}</td>
                  <td className="px-4 py-3 text-gray-500">{p.barcode ?? "-"}</td>
                  <td className="px-4 py-3">{p.kategori?.nama ?? "-"}</td>
                  <td className="px-4 py-3 text-right font-semibold">
                    Rp {p.harga.toLocaleString("id-ID")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`font-semibold ${
                        p.stok === 0
                          ? "text-red-600"
                          : p.stok <= 10
                          ? "text-orange-600"
                          : "text-green-600"
                      }`}
                    >
                      {p.stok}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <Link
                        href={`/produk/edit/${p.id}`}
                        className="inline-flex items-center justify-center w-8 h-8 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="inline-flex items-center justify-center w-8 h-8 text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                        title="Hapus"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-sm text-gray-500">
        Total: {filtered.length} produk
      </p>
    </div>
  );
}
