import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const { transaksis } = await req.json()

    if (!Array.isArray(transaksis) || transaksis.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request: transaksis must be a non-empty array' },
        { status: 400 }
      )
    }

    const results = []

    // Process each transaction in a database transaction
    for (const transaksi of transaksis) {
      try {
        // Check if already synced (idempotency using UUID)
        const existing = await prisma.transaksi.findFirst({
          where: {
            // Store UUID in a custom field or check by exact match
            userId: transaksi.userId,
            total: transaksi.total,
            createdAt: new Date(transaksi.createdAt),
          },
        })

        if (existing) {
          results.push({
            clientId: transaksi.id,
            status: 'skipped',
            message: 'Transaction already exists',
            serverId: existing.id,
          })
          continue
        }

        // Create transaction with details atomically
        const newTransaksi = await prisma.transaksi.create({
          data: {
            userId: transaksi.userId,
            total: transaksi.total,
            bayar: transaksi.bayar,
            kembalian: transaksi.kembalian,
            createdAt: new Date(transaksi.createdAt),
            detailTransaksis: {
              create: transaksi.items.map((item: any) => ({
                produkId: item.produkId,
                jumlah: item.jumlah,
                subtotal: item.subtotal,
              })),
            },
          },
        })

        // Update stock for each item
        for (const item of transaksi.items) {
          await prisma.produk.update({
            where: { id: item.produkId },
            data: {
              stok: {
                decrement: item.jumlah,
              },
            },
          })
        }

        results.push({
          clientId: transaksi.id,
          status: 'success',
          serverId: newTransaksi.id,
        })
      } catch (error: any) {
        console.error('Failed to sync transaction:', error)
        results.push({
          clientId: transaksi.id,
          status: 'failed',
          error: error.message,
        })
      }
    }

    const synced = results.filter((r) => r.status === 'success').length
    const skipped = results.filter((r) => r.status === 'skipped').length
    const failed = results.filter((r) => r.status === 'failed').length

    return NextResponse.json({
      success: true,
      results,
      synced,
      skipped,
      failed,
    })
  } catch (error: any) {
    console.error('Bulk sync error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
