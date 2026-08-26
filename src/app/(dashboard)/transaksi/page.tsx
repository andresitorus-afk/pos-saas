'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ShoppingCart, Plus, Minus, Trash2, Search, Banknote } from 'lucide-react'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { useSyncEngine } from '@/hooks/useSyncEngine'
import { offlineDBHelpers, OfflineProduk, OfflineTransaksiItem } from '@/lib/offline-db'
import PaymentModal from '@/components/PaymentModal'

interface StoreInfo {
  namaToko: string
  alamat: string
  noTelp: string
  footer: string
}

export default function TransaksiPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const isOnline = useOnlineStatus()
  const { syncTransaksis } = useSyncEngine()

  const [products, setProducts] = useState<OfflineProduk[]>([])
  const [cart, setCart] = useState<OfflineTransaksiItem[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [storeInfo, setStoreInfo] = useState<StoreInfo>({
    namaToko: 'Toko Saya',
    alamat: '',
    noTelp: '',
    footer: 'Terima kasih atas kunjungan Anda!',
  })

  useEffect(() => {
    if (!session) {
      router.replace('/login')
      return
    }
    loadProducts()
    loadStoreInfo()
  }, [session, router])

  const loadProducts = async () => {
    try {
      // Coba fetch dari server dulu (untuk cache offline)
      if (isOnline) {
        const res = await fetch('/api/produk')
        if (res.ok) {
          const data = await res.json()
          const offlineProducts: OfflineProduk[] = data.map((p: any) => ({
            id: p.id,
            nama: p.nama,
            barcode: p.barcode,
            harga: Number(p.harga),
            stok: p.stok,
            kategoriId: p.kategoriId,
            kategoriNama: p.kategori?.nama || '',
            gambar: p.gambar,
            updatedAt: new Date().toISOString(),
          }))
          await offlineDBHelpers.syncProduks(offlineProducts)
          setProducts(offlineProducts)
          setLoading(false)
          return
        }
      }
      // Fallback ke cache IndexedDB saat offline
      const cachedProducts = await offlineDBHelpers.getProduks()
      setProducts(cachedProducts)
    } catch (error) {
      console.error('Failed to load products:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStoreInfo = async () => {
    try {
      if (!isOnline) return
      const res = await fetch('/api/setting')
      if (res.ok) setStoreInfo(await res.json())
    } catch {
      // pakai default saat offline
    }
  }

  const filteredProducts = products.filter(
    (p) =>
      p.nama.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode?.toLowerCase().includes(search.toLowerCase())
  )

  const addToCart = (product: OfflineProduk) => {
    const existingItem = cart.find((item) => item.produkId === product.id)
    if (existingItem) {
      setCart(
        cart.map((item) =>
          item.produkId === product.id
            ? {
                ...item,
                jumlah: item.jumlah + 1,
                subtotal: (item.jumlah + 1) * item.harga,
              }
            : item
        )
      )
    } else {
      setCart([
        ...cart,
        {
          produkId: product.id,
          nama: product.nama,
          jumlah: 1,
          harga: product.harga,
          subtotal: product.harga,
        },
      ])
    }
  }

  const updateQuantity = (produkId: number, change: number) => {
    setCart(
      cart
        .map((item) => {
          if (item.produkId === produkId) {
            const newJumlah = Math.max(0, item.jumlah + change)
            return { ...item, jumlah: newJumlah, subtotal: newJumlah * item.harga }
          }
          return item
        })
        .filter((item) => item.jumlah > 0)
    )
  }

  const removeFromCart = (produkId: number) => {
    setCart(cart.filter((item) => item.produkId !== produkId))
  }

  const calculateTotal = () => cart.reduce((sum, item) => sum + item.subtotal, 0)

  /** Dipanggil PaymentModal setelah pembayaran sukses:
   *  simpan ke IndexedDB (offline-first), update stok lokal, sync jika online */
  const handleSaveTransaction = async (payment: {
    metode: string
    bayar: number
    kembalian: number
  }): Promise<string> => {
    const total = calculateTotal()

    const tx = await offlineDBHelpers.addTransaksi({
      userId: Number(session?.user?.id) || 1,
      items: cart,
      total,
      bayar: payment.bayar,
      kembalian: payment.kembalian,
      metodeBayar: payment.metode,
      paymentStatus: 'PAID',
    })

    // Update stok di cache lokal
    for (const item of cart) {
      await offlineDBHelpers.updateProdukStock(item.produkId, item.jumlah)
    }

    // Sync ke server jika online
    if (isOnline) {
      syncTransaksis()
    }

    // Reset keranjang & refresh stok
    setCart([])
    loadProducts()

    return tx.id
  }

  const total = calculateTotal()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-gray-500">
        Loading...
      </div>
    )
  }

  return (
    <div className="container mx-auto p-1">
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Produk */}
        <div className="lg:col-span-2">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold text-gray-800">Kasir</h1>
              {!isOnline && (
                <span className="px-3 py-1 bg-orange-100 text-orange-700 text-xs font-bold rounded-full">
                  MODE OFFLINE — data tersimpan lokal
                </span>
              )}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Cari nama / barcode..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {filteredProducts.length === 0 && (
              <p className="col-span-full text-center text-gray-400 py-10">
                Tidak ada produk.
              </p>
            )}
            {filteredProducts.map((product) => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                disabled={product.stok === 0}
                className="p-4 border border-gray-200 rounded-lg hover:shadow-md hover:border-blue-300 transition-all text-left disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <h3 className="font-bold mb-1 line-clamp-2">{product.nama}</h3>
                <div className="flex justify-between items-end mt-2">
                  <span className="font-bold text-blue-600">
                    Rp {product.harga.toLocaleString('id-ID')}
                  </span>
                  <span
                    className={`text-xs ${
                      product.stok > 10 ? 'text-green-600' : 'text-orange-600'
                    }`}
                  >
                    Stok {product.stok}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Keranjang */}
        <div className="lg:col-span-1">
          <div className="sticky top-20 border border-gray-200 rounded-xl bg-white shadow-sm flex flex-col max-h-[calc(100vh-6rem)]">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
              <ShoppingCart className="w-5 h-5 text-blue-600" />
              <h2 className="font-bold">Keranjang</h2>
              {cart.length > 0 && (
                <span className="ml-auto text-xs bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full">
                  {cart.length} item
                </span>
              )}
            </div>

            {cart.length === 0 ? (
              <p className="text-gray-400 text-center py-10 text-sm">
                Klik produk untuk menambah
              </p>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto space-y-2 p-3">
                  {cart.map((item) => (
                    <div key={item.produkId} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{item.nama}</p>
                        <p className="text-xs text-gray-500">
                          Rp {item.harga.toLocaleString('id-ID')} × {item.jumlah}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => updateQuantity(item.produkId, -1)}
                          className="w-6 h-6 flex items-center justify-center bg-gray-200 rounded hover:bg-gray-300 cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center font-bold text-sm">{item.jumlah}</span>
                        <button
                          onClick={() => updateQuantity(item.produkId, 1)}
                          className="w-6 h-6 flex items-center justify-center bg-gray-200 rounded hover:bg-gray-300 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => removeFromCart(item.produkId)}
                          className="w-6 h-6 flex items-center justify-center text-red-500 hover:bg-red-50 rounded cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      <span className="w-16 text-right text-xs font-bold whitespace-nowrap">
                        {(item.subtotal / 1000).toFixed(0)}k
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-gray-100 p-4 space-y-3">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-blue-600">{`Rp ${total.toLocaleString('id-ID')}`}</span>
                  </div>

                  <button
                    onClick={() => setPaymentOpen(true)}
                    className="w-full py-3.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Banknote className="w-5 h-5" />
                    Bayar Sekarang
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modal Pembayaran */}
      <PaymentModal
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        items={cart}
        total={total}
        storeInfo={storeInfo}
        onSaveTransaction={handleSaveTransaction}
      />
    </div>
  )
}
