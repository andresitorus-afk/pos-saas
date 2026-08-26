"use client";

import { useEffect, useMemo, useState } from "react";
import {
  X,
  Banknote,
  QrCode,
  CreditCard,
  Check,
  Loader2,
  Printer,
  PlusCircle,
  AlertTriangle,
} from "lucide-react";
import { paymentProviders, processPayment, type MetodeBayar } from "@/lib/payment";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

interface CartItem {
  produkId: number;
  nama: string;
  jumlah: number;
  harga: number;
  subtotal: number;
}

interface StrukData {
  transaksiId: string;
  metode: MetodeBayar;
  total: number;
  bayar: number;
  kembalian: number;
  items: CartItem[];
  paidAt: string;
}

type Step = "method" | "cash" | "confirm" | "processing" | "success" | "error";

const fmt = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;
const QUICK_CASH = [10000, 20000, 50000, 100000];

export default function PaymentModal({
  open,
  onClose,
  items,
  total,
  storeInfo,
  onSaveTransaction,
}: {
  open: boolean;
  onClose: () => void;
  items: CartItem[];
  total: number;
  storeInfo: { namaToko: string; alamat: string; noTelp: string; footer: string };
  /** Simpan transaksi ke IndexedDB (+sync). Return UUID transaksi. */
  onSaveTransaction: (payment: {
    metode: MetodeBayar;
    bayar: number;
    kembalian: number;
  }) => Promise<string>;
}) {
  const isOnline = useOnlineStatus();
  const [step, setStep] = useState<Step>("method");
  const [methodId, setMethodId] = useState<string>("TUNAI");
  const [cashReceived, setCashReceived] = useState<number>(0);
  const [error, setError] = useState("");
  const [struk, setStruk] = useState<StrukData | null>(null);

  const kembalian = Math.max(0, cashReceived - total);

  useEffect(() => {
    if (open) {
      setStep("method");
      setMethodId("TUNAI");
      setCashReceived(0);
      setError("");
      setStruk(null);
    }
  }, [open]);

  const selectedProvider = useMemo(
    () => paymentProviders.find((p) => p.id === methodId),
    [methodId]
  );

  if (!open) return null;

  /* ------------------------- Aksi ------------------------- */
  const startPayment = async () => {
    setStep("processing");
    try {
      // 1. Proses pembayaran via provider
      const result = await processPayment(methodId, {
        orderId: crypto.randomUUID(),
        amount: total,
        bayar: methodId === "TUNAI" ? cashReceived : total,
      });

      if (result.status === "FAILED") {
        setError(result.message ?? "Pembayaran gagal");
        setStep("error");
        return;
      }

      // 2. Simpan transaksi (offline-first ke IndexedDB)
      const txUuid = await onSaveTransaction({
        metode: result.metode,
        bayar: methodId === "TUNAI" ? cashReceived : total,
        kembalian: methodId === "TUNAI" ? cashReceived - total : 0,
      });

      // 3. Tampilkan konfirmasi sukses + struk
      setStruk({
        transaksiId: txUuid,
        metode: result.metode,
        total,
        bayar: methodId === "TUNAI" ? cashReceived : total,
        kembalian:
          methodId === "TUNAI" ? cashReceived - total : 0,
        items,
        paidAt: result.paidAt,
      });
      setStep("success");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Terjadi kesalahan");
      setStep("error");
    }
  };

  /* ------------------------- Render steps ------------------------- */
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-800">
            {step === "method" && "Pilih Metode Pembayaran"}
            {step === "cash" && "Pembayaran Tunai"}
            {step === "confirm" && "Konfirmasi Pembayaran"}
            {step === "processing" && "Memproses..."}
            {step === "success" && "Pembayaran Berhasil"}
            {step === "error" && "Pembayaran Gagal"}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:bg-gray-100 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-5">
          {/* STEP: Pilih metode */}
          {step === "method" && (
            <div className="space-y-3">
              {paymentProviders.map((p) => {
                const available = p.isAvailable();
                const Icon =
                  p.id === "TUNAI" ? Banknote : p.id === "QRIS" ? QrCode : CreditCard;
                return (
                  <button
                    key={p.id}
                    disabled={!available}
                    onClick={() => {
                      setMethodId(p.id);
                      if (p.id === "TUNAI") setStep("cash");
                      else setStep("confirm");
                    }}
                    className={`w-full flex items-center gap-4 p-4 border-2 rounded-xl text-left transition-all cursor-pointer ${
                      available
                        ? "border-gray-200 hover:border-blue-500 hover:bg-blue-50"
                        : "border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed"
                    }`}
                  >
                    <div
                      className={`w-11 h-11 rounded-lg flex items-center justify-center ${
                        available ? "bg-blue-100 text-blue-600" : "bg-gray-200 text-gray-400"
                      }`}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800">{p.label}</p>
                      <p className="text-xs text-gray-500">{p.description}</p>
                    </div>
                    {!available &&
                      (isOnline ? (
                        <span className="px-2 py-1 text-[10px] font-bold bg-orange-100 text-orange-700 rounded-full">
                          BUTUH MIDTRANS
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-[10px] font-bold bg-red-100 text-red-700 rounded-full">
                          OFFLINE
                        </span>
                      ))}
                  </button>
                );
              })}

              {/* Total */}
              <div className="flex justify-between items-center pt-3 mt-2 border-t-2 border-dashed border-gray-200">
                <span className="font-semibold text-gray-600">Total Bayar</span>
                <span className="text-xl font-bold text-blue-600">{fmt(total)}</span>
              </div>
            </div>
          )}

          {/* STEP: Input tunai */}
          {step === "cash" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  Uang Diterima
                </label>
                <input
                  type="number"
                  autoFocus
                  min={0}
                  value={cashReceived || ""}
                  onChange={(e) => setCashReceived(Number(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full px-4 py-3 text-2xl font-bold border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Quick amount */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setCashReceived(total)}
                  className="py-2.5 text-sm font-semibold bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors cursor-pointer"
                >
                  Uang Pas
                </button>
                {QUICK_CASH.map((v) => (
                  <button
                    key={v}
                    onClick={() => setCashReceived(v)}
                    className="py-2.5 text-sm font-semibold bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
                  >
                    {fmt(v)}
                  </button>
                ))}
              </div>

              {/* Kembalian live */}
              <div
                className={`flex justify-between items-center p-4 rounded-xl ${
                  cashReceived >= total ? "bg-green-50" : "bg-gray-50"
                }`}
              >
                <span className="font-medium text-gray-600">Kembalian</span>
                <span
                  className={`text-2xl font-bold ${
                    cashReceived >= total ? "text-green-600" : "text-gray-400"
                  }`}
                >
                  {fmt(kembalian)}
                </span>
              </div>

              <div className="flex justify-between text-sm text-gray-500">
                <span>Total belanja</span>
                <span className="font-semibold">{fmt(total)}</span>
              </div>

              <button
                disabled={cashReceived < total}
                onClick={() => setStep("confirm")}
                className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                Lanjut Konfirmasi
              </button>
              <button
                onClick={() => setStep("method")}
                className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 cursor-pointer"
              >
                ← Ganti metode
              </button>
            </div>
          )}

          {/* STEP: Konfirmasi */}
          {step === "confirm" && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-xl p-4 space-y-2 max-h-48 overflow-y-auto">
                {items.map((item) => (
                  <div key={item.produkId} className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      {item.nama}{" "}
                      <span className="text-gray-400">×{item.jumlah}</span>
                    </span>
                    <span className="font-medium">{fmt(item.subtotal)}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Metode</span>
                  <span className="font-semibold">{selectedProvider?.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Total</span>
                  <span className="font-semibold">{fmt(total)}</span>
                </div>
                {methodId === "TUNAI" && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Bayar</span>
                      <span className="font-semibold">{fmt(cashReceived)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Kembalian</span>
                      <span className="font-bold text-green-600">{fmt(kembalian)}</span>
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={startPayment}
                className="w-full py-3.5 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors cursor-pointer"
              >
                ✓ Proses Pembayaran
              </button>
              <button
                onClick={() => setStep(methodId === "TUNAI" ? "cash" : "method")}
                className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 cursor-pointer"
              >
                ← Kembali
              </button>
            </div>
          )}

          {/* STEP: Processing */}
          {step === "processing" && (
            <div className="py-10 flex flex-col items-center gap-4">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
              <p className="font-medium text-gray-600">Memproses pembayaran...</p>
              <p className="text-xs text-gray-400">Mohon tunggu sebentar</p>
            </div>
          )}

          {/* STEP: Success */}
          {step === "success" && struk && (
            <div className="space-y-4">
              <div className="flex flex-col items-center py-2">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-3">
                  <Check className="w-9 h-9 text-green-600" strokeWidth={3} />
                </div>
                <p className="text-xl font-bold text-gray-800">Transaksi Berhasil!</p>
                <p className="text-xs text-gray-400 mt-1 font-mono">
                  #{struk.transaksiId.slice(0, 8).toUpperCase()}
                </p>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Metode</span>
                  <span className="font-semibold">{struk.metode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Total</span>
                  <span className="font-semibold">{fmt(struk.total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Bayar</span>
                  <span className="font-semibold">{fmt(struk.bayar)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Kembalian</span>
                  <span className="font-bold text-green-700">{fmt(struk.kembalian)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => window.print()}
                  className="flex items-center justify-center gap-2 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  Cetak Struk
                </button>
                <button
                  onClick={onClose}
                  className="flex items-center justify-center gap-2 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  Transaksi Baru
                </button>
              </div>

              {/* Struk tersembunyi - tampil saat print */}
              <div id="struk-print" className="hidden print:block">
                <Receipt struk={struk} storeInfo={storeInfo} />
              </div>
            </div>
          )}

          {/* STEP: Error */}
          {step === "error" && (
            <div className="py-6 flex flex-col items-center gap-3 text-center">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <p className="font-semibold text-gray-800">{error}</p>
              <button
                onClick={() => setStep("method")}
                className="mt-2 px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 cursor-pointer"
              >
                Coba Lagi
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------- Struk Thermal 80mm ------------------------- */
function Receipt({
  struk,
  storeInfo,
}: {
  struk: StrukData;
  storeInfo: { namaToko: string; alamat: string; noTelp: string; footer: string };
}) {
  const now = new Date(struk.paidAt);
  return (
    <div className="font-mono text-black text-xs leading-relaxed whitespace-pre-wrap">
{`================================
        ${storeInfo.namaToko || "TOKO SAYA"}
${storeInfo.alamat || ""}
${storeInfo.noTelp ? `Telp: ${storeInfo.noTelp}` : ""}
================================
No   : #${struk.transaksiId.slice(0, 8).toUpperCase()}
Date : ${now.toLocaleString("id-ID")}
Metode: ${struk.metode}
--------------------------------`}
{struk.items.map((item) =>
` ${item.nama.padEnd(14).slice(0, 14)} ${item.jumlah}x ${item.subtotal.toLocaleString("id-ID")}\n`
)}
{`--------------------------------
TOTAL       : Rp ${struk.total.toLocaleString("id-ID")}
BAYAR       : Rp ${struk.bayar.toLocaleString("id-ID")}
KEMBALIAN   : Rp ${struk.kembalian.toLocaleString("id-ID")}
================================
${storeInfo.footer || "Terima kasih atas kunjungan Anda!"}
================================`}
    </div>
  );
}
