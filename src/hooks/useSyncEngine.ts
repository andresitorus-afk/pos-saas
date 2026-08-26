'use client'

import { useEffect, useCallback } from 'react'
import { useOnlineStatus } from './useOnlineStatus'
import { offlineDB, offlineDBHelpers } from '@/lib/offline-db'

export function useSyncEngine() {
  const isOnline = useOnlineStatus()

  const syncTransaksis = useCallback(async () => {
    if (!isOnline) return

    try {
      const pendingTransaksis = await offlineDBHelpers.getPendingTransaksis()
      
      if (pendingTransaksis.length === 0) return

      console.log(`🔄 Syncing ${pendingTransaksis.length} transaksi...`)

      // Bulk sync to backend
      const response = await fetch('/api/transaksi/bulk-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transaksis: pendingTransaksis }),
      })

      if (!response.ok) {
        throw new Error('Sync failed: ' + response.statusText)
      }

      const result = await response.json()

      // Mark successful transactions as synced
      for (const item of result.results || []) {
        if (item.status === 'success') {
          await offlineDBHelpers.markTransaksiSynced(item.clientId, item.serverId)
        } else if (item.status === 'failed') {
          await offlineDBHelpers.markTransaksiFailed(item.clientId, item.error)
        }
      }

      // Clear synced items from queue
      await offlineDBHelpers.clearSyncedQueue()

      console.log(`✅ Sync completed: ${result.synced} synced, ${result.failed} failed`)
      
      return result
    } catch (error) {
      console.error('❌ Sync failed:', error)
      
      // Mark transactions as failed
      const pendingTransaksis = await offlineDBHelpers.getPendingTransaksis()
      for (const transaksi of pendingTransaksis) {
        await offlineDBHelpers.markTransaksiFailed(
          transaksi.id,
          error instanceof Error ? error.message : 'Unknown error'
        )
      }
    }
  }, [isOnline])

  // Auto sync when coming back online
  useEffect(() => {
    if (isOnline) {
      syncTransaksis()
    }
  }, [isOnline, syncTransaksis])

  // Periodic sync every 30 seconds when online
  useEffect(() => {
    if (!isOnline) return

    const interval = setInterval(() => {
      syncTransaksis()
    }, 30000)

    return () => clearInterval(interval)
  }, [isOnline, syncTransaksis])

  return {
    isOnline,
    syncTransaksis,
  }
}
