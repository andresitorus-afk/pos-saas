'use client'

import { Wifi, WifiOff } from 'lucide-react'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { useSyncEngine } from '@/hooks/useSyncEngine'
import { useEffect, useState } from 'react'
import { offlineDBHelpers } from '@/lib/offline-db'

export function OfflineIndicator() {
  const isOnline = useOnlineStatus()
  const { syncTransaksis } = useSyncEngine()
  const [stats, setStats] = useState({ pending: 0, synced: 0, failed: 0 })

  useEffect(() => {
    const loadStats = async () => {
      const data = await offlineDBHelpers.getStats()
      setStats(data)
    }
    
    loadStats()
    const interval = setInterval(loadStats, 5000) // Update every 5s
    
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg backdrop-blur-sm ${
        isOnline 
          ? 'bg-green-500/90 text-white' 
          : 'bg-orange-500/90 text-white'
      }`}>
        {isOnline ? (
          <>
            <Wifi className="w-5 h-5" />
            <span className="font-semibold">Online</span>
          </>
        ) : (
          <>
            <WifiOff className="w-5 h-5" />
            <span className="font-semibold">Offline Mode</span>
          </>
        )}
        
        {stats.pending > 0 && (
          <span className="ml-2 px-2 py-1 bg-white/20 rounded text-xs font-bold">
            {stats.pending} pending sync
          </span>
        )}
      </div>
      
      {stats.pending > 0 && isOnline && (
        <button
          onClick={() => syncTransaksis()}
          className="mt-2 w-full px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-semibold hover:bg-blue-600 transition-colors"
        >
          Sync Now
        </button>
      )}
    </div>
  )
}
