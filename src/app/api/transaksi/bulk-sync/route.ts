import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/transaksi/bulk-sync
 * Bulk sync transaksi offline dari IndexedDB client.
 * Idempotency via clientId (UUID) - mencegah duplikasi saat retry.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { transaksis } = await req.json();

    if (!Array.isArray(transaksis) || transaksis.length === 0) {
      return NextResponse.json(
        { error: "transaksis harus berupa array yang tidak kosong" },
        { status: 400 }
      );
    }

    const results = [];

    for (const t of transaksis) {
      try {
        // Idempotency check via UUID clientId
        if (t.id) {
          const existing = await prisma.transaksi.findUnique({
            where: { clientId: t.id },
          });

          if (existing) {
            results.push({
              clientId: t.id,
              status: "skipped",
              serverId: existing.id,
            });
            continue;
          }
        }

        // Get products for price validation
        const produkIds = (t.items ?? []).map((i: { produkId: number }) => i.produkId);
        const produks = await prisma.produk.findMany({
          where: { id: { in: produkIds } },
        });
        const produkMap = new Map(produks.map((p) => [p.id, p]));

        const total = (t.items ?? []).reduce((sum: number, item: { produkId: number; jumlah: number }) => {
          const produk = produkMap.get(item.produkId);
          return sum + Number(produk?.harga ?? 0) * item.jumlah;
        }, 0);

        // Atomic: create transaksi + details + decrement stock
        await prisma.$transaction(async (tx) => {
          await tx.transaksi.create({
            data: {
              userId: Number(session.user!.id),
              clientId: t.id || null,
              total,
              bayar: Number(t.bayar),
              kembalian: Number(t.bayar) - total,
              metodeBayar: t.metodeBayar || "TUNAI",
              paymentStatus: t.paymentStatus || "PAID",
              syncStatus: "synced",
              createdAt: t.createdAt ? new Date(t.createdAt) : new Date(),
              detailTransaksis: {
                create: (t.items ?? []).map(
                  (item: { produkId: number; jumlah: number }) => {
                    const produk = produkMap.get(item.produkId)!;
                    return {
                      produkId: item.produkId,
                      jumlah: item.jumlah,
                      subtotal: Number(produk.harga) * item.jumlah,
                    };
                  }
                ),
              },
            },
          });

          // Update stock untuk tiap item
          for (const item of t.items ?? []) {
            await tx.produk.update({
              where: { id: item.produkId },
              data: { stok: { decrement: item.jumlah } },
            });
          }
        });

        results.push({
          clientId: t.id,
          status: "success",
        });
      } catch (error) {
        console.error(`Failed to sync transaction ${t.id}:`, error);
        results.push({
          clientId: t.id,
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({
      success: true,
      results,
      synced: results.filter((r) => r.status === "success").length,
      skipped: results.filter((r) => r.status === "skipped").length,
      failed: results.filter((r) => r.status === "failed").length,
    });
  } catch (error) {
    console.error("Bulk sync error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal melakukan sync" },
      { status: 500 }
    );
  }
}
