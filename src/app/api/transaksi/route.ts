import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/transaksi - list transaksi user/tenant
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get("limit")) || 20;

    const transaksis = await prisma.transaksi.findMany({
      include: {
        user: { select: { name: true } },
        detailTransaksis: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    const data = transaksis.map((t) => ({
      ...t,
      total: Number(t.total),
      bayar: Number(t.bayar),
      kembalian: Number(t.kembalian),
      detailTransaksis: t.detailTransaksis.map((d) => ({
        ...d,
        subtotal: Number(d.subtotal),
      })),
    }));

    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/transaksi error:", error);
    return NextResponse.json({ error: "Gagal mengambil transaksi" }, { status: 500 });
  }
}

// POST /api/transaksi - simpan transaksi baru (online mode)
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { items, bayar, clientId } = body as {
      items: { produkId: number; jumlah: number; subtotal: number }[];
      bayar: number;
      clientId?: string;
    };

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Keranjang kosong" }, { status: 400 });
    }

    // Idempotency check via clientId
    if (clientId) {
      const existing = await prisma.transaksi.findUnique({
        where: { clientId },
      });
      if (existing) {
        return NextResponse.json({
          success: true,
          skipped: true,
          transaksiId: existing.id,
          message: "Transaksi sudah pernah disimpan",
        });
      }
    }

    // Get products for price snapshot & validate stock
    const produkIds = items.map((i) => i.produkId);
    const produks = await prisma.produk.findMany({
      where: { id: { in: produkIds } },
    });
    const produkMap = new Map(produks.map((p) => [p.id, p]));

    const total = items.reduce((sum, item) => {
      const produk = produkMap.get(item.produkId);
      return sum + Number(produk?.harga ?? 0) * item.jumlah;
    }, 0);

    if (bayar < total) {
      return NextResponse.json({ error: "Jumlah bayar kurang" }, { status: 400 });
    }

    // Atomic transaction: create transaksi + details + decrement stock
    const transaksi = await prisma.$transaction(async (tx) => {
      const created = await tx.transaksi.create({
        data: {
          userId: Number(session.user!.id),
          clientId: clientId || null,
          total,
          bayar: Number(bayar),
          kembalian: Number(bayar) - total,
          syncStatus: "synced",
          detailTransaksis: {
            create: items.map((item) => {
              const produk = produkMap.get(item.produkId)!;
              return {
                produkId: item.produkId,
                jumlah: item.jumlah,
                subtotal: Number(produk.harga) * item.jumlah,
              };
            }),
          },
        },
      });

      // Update stock
      for (const item of items) {
        await tx.produk.update({
          where: { id: item.produkId },
          data: { stok: { decrement: item.jumlah } },
        });
      }

      return created;
    });

    return NextResponse.json(
      {
        success: true,
        transaksiId: transaksi.id,
        total,
        kembalian: Number(bayar) - total,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/transaksi error:", error);
    return NextResponse.json(
      { error: "Gagal menyimpan transaksi" },
      { status: 500 }
    );
  }
}
