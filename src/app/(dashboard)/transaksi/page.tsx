'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ShoppingCart, Plus, Minus, Trash2, Search } from 'lucide-react'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { useSyncEngine } from '@/hooks/useSyncEngine'
import { offlineDBHelpers, OfflineProduk, OfflineTransaksiItem } from '@/lib/offline-db'

export default function TransaksiPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const isOnline = useOnlineStatus()
  const { syncTransaksis } = useSyncEngine()

  const [products, setProducts] = useState<OfflineProduk[]>([])
  const [cart, setCart] = useState<OfflineTransaksiItem[]>([])
  const [search, setSearch] = useState('')
  const [bayar, setBayar] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session) {
      router.push('/login')
      return
    }
    loadProducts()
  }, [session, router])

  const loadProducts = async () => {
    try {
      // Try fetch from server first
      if (isOnline) {
        const res = await fetch('/api/produk')
        if (res.ok) {
          const data = await res.json()
          
          // Transform and cache to IndexedDB
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

      // Fallback to offline cache
      const cachedProducts = await offlineDBHelpers.getProduks()
      setProducts(cachedProducts)
    } catch (error) {
      console.error('Failed to load products:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredProducts = products.filter(p => 
    p.nama.toLowerCase().includes(search.toLowerCase()) ||
    p.barcode?.toLowerCase().includes(search.toLowerCase())
  )

  const addToCart = (product: OfflineProduk) => {
    const existingItem = cart.find(item => item.produkId === product.id)
    
    if (existingItem) {
      setCart(cart.map(item =>
        item.produkId === product.id
          ? {
              ...item,
              jumlah: item.jumlah + 1,
              subtotal: (item.jumlah + 1) * item.harga
            }
          : item
      ))
    } else {
      setCart([...cart, {
        produkId: product.id,
        nama: product.nama,
        jumlah: 1,
        harga: product.harga,
        subtotal: product.harga,
      }])
    }
  }

  const updateQuantity = (produkId: number, change: number) => {
    setCart(cart.map(item => {
      if (item.produkId === produkId) {
        const newJumlah = Math.max(0, item.jumlah + change)
        return {
          ...item,
          jumlah: newJumlah,
          subtotal: newJumlah * item.harga,
        }
      }
      return item
    }).filter(item => item.jumlah > 0))
  }

  const removeFromCart = (produkId: number) => {
    setCart(cart.filter(item => item.produkId !== produkId))
  }

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + item.subtotal, 0)
  }

  const handleBayar = async () => {
    if (cart.length === 0) {
      alert('Keranjang kosong!')
      return
    }

    const total = calculateTotal()
    
    if (bayar < total) {
      alert('Jumlah bayar kurang!')
      return
    }

    const kembalian = bayar - total

    try {
      // Save to IndexedDB first (instant, offline-first)
      const offlineTransaksi = await offlineDBHelpers.addTransaksi({
        userId: Number(session?.user?.id) || 1,
        items: cart,
        total,
        bayar,
        kembalian,
      })

      // Update local product stock
      for (const item of cart) {
        await offlineDBHelpers.updateProdukStock(item.produkId, item.jumlah)
      }

      // Show success
      alert(
        `✅ Transaksi Berhasil!\n\n` +
        `ID: ${offlineTransaksi.id}\n` +
        `Total: Rp ${total.toLocaleString('id-ID')}\n` +
        `Bayar: Rp ${bayar.toLocaleString('id-ID')}\n` +
        `Kembalian: Rp ${kembalian.toLocaleString('id-ID')}\n\n` +
        `${isOnline ? 'Sedang sync ke server...' : 'Akan sync saat online'}`
      )

      // Clear cart
      setCart([])
      setBayar(0)

      // Reload products to update stock
      await loadProducts()

      // Trigger sync if online
      if (isOnline) {
        await syncTransaksis()
      }
    } catch (error) {
      console.error('Failed to save transaction:', error)
      alert('❌ Gagal menyimpan transaksi!')
    }
  }

  const total = calculateTotal()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4">
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Products Section */}
        <div className="lg:col-span-2">
          <div className="mb-4">
            <h1 className="text-2xl font-bold mb-4">Kasir - Transaksi</h1>
            
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Cari produk..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Product Grid */}
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {filteredProducts.map(product => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                disabled={product.stok === 0}
                className="p-4 border rounded-lg hover:shadow-lg transition-shadow text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <h3 className="font-bold text-lg mb-1">{product.nama}</h3>
                {product.barcode && (
                  <p className="text-xs text-gray-500 mb-2">{product.barcode}</p>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-blue-600">
                    Rp {product.harga.toLocaleString('id-ID')}
                  </span>
                  <span className={`text-sm ${product.stok > 10 ? 'text-green-600' : 'text-orange-600'}`}>
                    Stok: {product.stok}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Cart Section */}
        <div className="lg:col-span-1">
          <div className="sticky top-4 border rounded-lg p-4 bg-white shadow-lg">
            <div className="flex items-center gap-2 mb-4">
              <ShoppingCart className="w-6 h-6" />
              <h2 className="text-xl font-bold">Keranjang</h2>
            </div>

            {cart.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Keranjang kosong</p>
            ) : (
              <>
                {/* Cart Items */}
                <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                  {cart.map(item => (
                    <div key={item.produkId} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{item.nama}</p>
                        <p className="text-xs text-gray-600">
                          Rp {item.harga.toLocaleString('id-ID')}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.produkId, -1)}
                          className="w-6 h-6 flex items-center justify-center bg-gray-200 rounded hover:bg-gray-300"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        
                        <span className="w-8 text-center font-bold">{item.jumlah}</span>
                        
                        <button
                          onClick={() => updateQuantity(item.produkId, 1)}
                          className="w-6 h-6 flex items-center justify-center bg-gray-200 rounded hover:bg-gray-300"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        
                        <button
                          onClick={() => removeFromCart(item.produkId)}
                          className="w-6 h-6 flex items-center justify-center text-red-500 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Total */}
                <div className="border-t pt-4 space-y-3">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span className="text-blue-600">
                      Rp {total.toLocaleString('id-ID')}
                    </span>
                  </div>

                  {/* Payment Input */}
                  <div>
                    <label className="block text-sm font-semibold mb-1">
                      Jumlah Bayar:
                    </label>
                    <input
                      type="number"
                      value={bayar || ''}
                      onChange={(e) => setBayar(Number(e.target.value))}
                      placeholder="0"
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Change */}
                  {bayar >= total && bayar > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>Kembalian:</span>
                      <span className="font-bold text-green-600">
                        Rp {(bayar - total).toLocaleString('id-ID')}
                      </span>
                    </div>
                  )}

                  {/* Pay Button */}
                  <button
                    onClick={handleBayar}
                    disabled={cart.length === 0 || bayar < total}
                    className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    Bayar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
