import Dexie, { Table } from 'dexie'

// Types untuk offline storage
export interface OfflineTransaksi {
  id: string // UUID client-side
  userId: number
  items: OfflineTransaksiItem[]
  total: number
  bayar: number
  kembalian: number
  status: 'pending_sync' | 'synced' | 'failed'
  createdAt: string
  syncedAt?: string
  errorMessage?: string
}

export interface OfflineTransaksiItem {
  produkId: number
  nama: string
  jumlah: number
  harga: number
  subtotal: number
}

export interface OfflineProduk {
  id: number
  nama: string
  barcode: string | null
  harga: number
  stok: number
  kategoriId: number
  kategoriNama: string
  gambar: string | null
  updatedAt: string
}

export interface SyncQueue {
  id: string
  type: 'transaksi'
  data: any
  status: 'pending' | 'processing' | 'failed'
  attempts: number
  createdAt: string
  lastAttemptAt?: string
  errorMessage?: string
}

// Dexie Database
class POSSaaSDB extends Dexie {
  transaksis!: Table<OfflineTransaksi>
  produks!: Table<OfflineProduk>
  syncQueue!: Table<SyncQueue>

  constructor() {
    super('POSSaaSOffline')
    
    this.version(1).stores({
      transaksis: 'id, userId, status, createdAt, syncedAt',
      produks: 'id, nama, barcode, kategoriId',
      syncQueue: 'id, type, status, createdAt, lastAttemptAt',
    })
  }
}

export const offlineDB = new POSSaaSDB()

// Helper functions
export const offlineDBHelpers = {
  // Add transaction to local DB
  async addTransaksi(transaksi: Omit<OfflineTransaksi, 'id' | 'createdAt' | 'status'>) {
    const id = crypto.randomUUID()
    const newTransaksi: OfflineTransaksi = {
      ...transaksi,
      id,
      status: 'pending_sync',
      createdAt: new Date().toISOString(),
    }
    
    await offlineDB.transaksis.add(newTransaksi)
    await offlineDB.syncQueue.add({
      id: crypto.randomUUID(),
      type: 'transaksi',
      data: newTransaksi,
      status: 'pending',
      attempts: 0,
      createdAt: new Date().toISOString(),
    })
    
    return newTransaksi
  },

  // Get pending transactions for sync
  async getPendingTransaksis() {
    return await offlineDB.transaksis
      .where('status')
      .equals('pending_sync')
      .toArray()
  },

  // Mark transaction as synced
  async markTransaksiSynced(id: string, serverId?: number) {
    await offlineDB.transaksis.update(id, {
      status: 'synced',
      syncedAt: new Date().toISOString(),
    })
  },

  // Mark transaction as failed
  async markTransaksiFailed(id: string, errorMessage: string) {
    await offlineDB.transaksis.update(id, {
      status: 'failed',
      errorMessage,
    })
  },

  // Update product stock locally
  async updateProdukStock(produkId: number, jumlahDijual: number) {
    const produk = await offlineDB.produks.get(produkId)
    if (produk) {
      await offlineDB.produks.update(produkId, {
        stok: produk.stok - jumlahDijual,
        updatedAt: new Date().toISOString(),
      })
    }
  },

  // Sync products from server
  async syncProduks(produks: OfflineProduk[]) {
    await offlineDB.produks.bulkPut(produks)
  },

  // Get sync queue items
  async getSyncQueue() {
    return await offlineDB.syncQueue
      .where('status')
      .equals('pending')
      .toArray()
  },

  // Clear synced items from queue
  async clearSyncedQueue() {
    const syncedTransaksis = await offlineDB.transaksis
      .where('status')
      .equals('synced')
      .toArray()
    
    const syncedIds = syncedTransaksis.map(t => t.id)
    
    await offlineDB.syncQueue
      .where('data.id')
      .anyOf(syncedIds)
      .delete()
  },

  // Get statistics
  async getStats() {
    const allTransaksis = await offlineDB.transaksis.toArray()

    const pending = allTransaksis.filter(t => t.status === 'pending_sync').length
    const synced = allTransaksis.filter(t => t.status === 'synced').length
    const failed = allTransaksis.filter(t => t.status === 'failed').length
    const totalRevenue = allTransaksis
      .filter(t => t.status === 'synced')
      .reduce((sum, t) => sum + Number(t.total), 0)

    return {
      total: allTransaksis.length,
      pending,
      synced,
      failed,
      totalRevenue,
    }
  },

  // Get products from IndexedDB
  async getProduks() {
    return await offlineDB.produks.toArray()
  },

  // Clear all data (for reset)
  async clearAll() {
    await offlineDB.transaksis.clear()
    await offlineDB.produks.clear()
    await offlineDB.syncQueue.clear()
  },
}
