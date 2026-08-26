/**
 * Payment Abstraction Layer
 * -------------------------
 * Semua metode pembayaran lewat interface PaymentProvider.
 * Nanti tinggal implement MidtransProvider (Snap API) tanpa ubah UI.
 *
 * Kontrak provider:
 *  - isAvailable(): apakah metode bisa dipakai sekarang (mis. butuh API key / online)
 *  - pay(input): proses pembayaran, return PaymentResult
 */

export type MetodeBayar = "TUNAI" | "QRIS" | "DEBIT_KREDIT" | "TRANSFER";
export type PaymentStatus = "PAID" | "PENDING" | "FAILED";

export interface PaymentInput {
  orderId: string; // UUID transaksi (idempotency)
  amount: number;
  bayar?: number; // khusus tunai: uang diterima
}

export interface PaymentResult {
  status: PaymentStatus;
  metode: MetodeBayar;
  paidAt: string;
  reference?: string; // gateway ref (Midtrans order_id / snap token)
  message?: string;
}

export interface PaymentProvider {
  id: string;
  label: string;
  description: string;
  /** true = jalan tanpa internet/gateway */
  offlineCapable: boolean;
  isAvailable(): boolean;
  pay(input: PaymentInput): Promise<PaymentResult>;
}

/** Flag global: set true saat Midtrans live */
export const GATEWAY_ENABLED = false;

/* ------------------------------------------------------------------ */
/* Provider: TUNAI (offline, instant)                                  */
/* ------------------------------------------------------------------ */
const cashProvider: PaymentProvider = {
  id: "TUNAI",
  label: "Tunai",
  description: "Bayar langsung di kasir",
  offlineCapable: true,
  isAvailable: () => true,
  async pay(input) {
    if (!input.bayar || input.bayar < input.amount) {
      return {
        status: "FAILED",
        metode: "TUNAI",
        paidAt: new Date().toISOString(),
        message: "Jumlah uang diterima kurang dari total",
      };
    }
    return {
      status: "PAID",
      metode: "TUNAI",
      paidAt: new Date().toISOString(),
    };
  },
};

/* ------------------------------------------------------------------ */
/* Provider: QRIS via Midtrans (placeholder - aktif saat GATEWAY_ENABLED) */
/* Alur nanti:                                                         */
/*  1. POST /api/payment/midtrans/create -> snapToken (server-side)     */
/*  2. window.snap.pay(snapToken, { onSuccess, onPending, onError })    */
/*  3. Webhook /api/payment/midtrans/webhook -> update paymentStatus    */
/* ------------------------------------------------------------------ */
const qrisMidtransProvider: PaymentProvider = {
  id: "QRIS",
  label: "QRIS",
  description: "Scan & bayar via e-wallet",
  offlineCapable: false,
  isAvailable: () => GATEWAY_ENABLED && typeof navigator !== "undefined" && navigator.onLine,
  async pay(_input) {
    throw new Error(
      "Integrasi Midtrans belum dikonfigurasi. Set GATEWAY_ENABLED + API keys untuk mengaktifkan."
    );
  },
};

const cardMidtransProvider: PaymentProvider = {
  id: "DEBIT_KREDIT",
  label: "Debit/Kredit",
  description: "Kartu debit/kredit via mesin EDC",
  offlineCapable: false,
  isAvailable: () => GATEWAY_ENABLED,
  async pay(_input) {
    throw new Error("Integrasi gateway kartu belum dikonfigurasi.");
  },
};

/** Registry semua provider — UI membaca daftar ini */
export const paymentProviders: PaymentProvider[] = [
  cashProvider,
  qrisMidtransProvider,
  cardMidtransProvider,
];

/** Proses pembayaran via provider terdaftar */
export async function processPayment(
  methodId: string,
  input: PaymentInput
): Promise<PaymentResult> {
  const provider = paymentProviders.find((p) => p.id === methodId);
  if (!provider) {
    return {
      status: "FAILED",
      metode: "TUNAI",
      paidAt: new Date().toISOString(),
      message: `Metode ${methodId} tidak dikenal`,
    };
  }
  if (!provider.isAvailable()) {
    return {
      status: "FAILED",
      metode: provider.id as MetodeBayar,
      paidAt: new Date().toISOString(),
      message: `${provider.label} belum tersedia (butuh integrasi gateway)`,
    };
  }
  return provider.pay(input);
}
