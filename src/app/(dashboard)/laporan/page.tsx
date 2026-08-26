"use client";

import { useState, useEffect } from "react";
import { Printer } from "lucide-react";

interface LaporanItem {
  id: number;
  tanggal: string;
  kasir: string;
  total: number;
}

interface Ringkasan {
  totalPenjualan: number;
  jumlahTransaksi: number;
  rataRata: number;
}

export default function LaporanPage() {
  const [dari, setDari] = useState("");
  const [sampai, setSampai] = useState("");
  const [data, setData] = useState<LaporanItem[]>([]);
  const [ringkasan, setRingkasan] = useState<Ringkasan | null>(null);
  const [loading, setLoading] = useState(false);

  const loadLaporan = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dari) params.set("dari", dari);
      if (sampai) params.set("sampai", sampai);

      const res = await fetch(`/api/laporan?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
        setRingkasan(json.ringkasan);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLaporan();
  }, []);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Laporan Penjualan</h1>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-700 text-white text-sm font-semibold rounded-lg hover:bg-gray-800 transition-colors cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          Cetak
        </button>
      </div>

      {/* Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6 print:hidden">
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Dari Tanggal
          </label>
          <input
            type="date"
            value={dari}
            onChange={(e) => setDari(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Sampai Tanggal
          </label>
          <input
            type="date"
            value={sampai}
            onChange={(e) => setSampai(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-end">
          <button
            onClick={loadLaporan}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors cursor-pointer"
          >
            {loading ? "Memuat..." : "Filter"}
          </button>
        </div>
      </div>

      {/* Ringkasan */}
      {ringkasan && (
        <div className="grid sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <p className="text-xs text-gray-500 mb-1">Total Penjualan</p>
            <p className="text-xl font-bold text-green-600">
              Rp {ringkasan.totalPenjualan.toLocaleString("id-ID")}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <p className="text-xs text-gray-500 mb-1">Jumlah Transaksi</p>
            <p className="text-xl font-bold text-blue-600">
              {ringkasan.jumlahTransaksi}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <p className="text-xs text-gray-500 mb-1">Rata-rata / Transaksi</p>
            <p className="text-xl font-bold text-purple-600">
              Rp{" "}
              {Math.round(ringkasan.rataRata).toLocaleString("id-ID")}
            </p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-left">
            <tr>
              <th className="px-4 py-3 font-semibold">No</th>
              <th className="px-4 py-3 font-semibold">Tanggal</th>
              <th className="px-4 py-3 font-semibold">Kasir</th>
              <th className="px-4 py-3 font-semibold text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                  Tidak ada transaksi pada periode ini.
                </td>
              </tr>
            ) : (
              data.map((t, i) => (
                <tr key={t.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">{i + 1}</td>
                  <td className="px-4 py-3">
                    {new Date(t.tanggal).toLocaleString("id-ID", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-3">{t.kasir}</td>
                  <td className="px-4 py-3 text-right font-semibold">
                    Rp {t.total.toLocaleString("id-ID")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
