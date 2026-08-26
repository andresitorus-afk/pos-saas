import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/laporan?dari=2026-08-01&sampai=2026-08-26
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const dari = searchParams.get("dari");
    const sampai = searchParams.get("sampai");

    const where: Record<string, unknown> = {};

    if (dari || sampai) {
      where.createdAt = {};
      if (dari) Object.assign(where.createdAt as object, { gte: new Date(dari) });
      if (sampai) {
        const end = new Date(sampai);
        end.setHours(23, 59, 59, 999);
        Object.assign(where.createdAt as object, { lte: end });
      }
    }

    const [transaksis, ringkasan] = await Promise.all([
      prisma.transaksi.findMany({
        where,
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.transaksi.aggregate({
        where,
        _sum: { total: true },
        _count: true,
      }),
    ]);

    const data = transaksis.map((t) => ({
      id: t.id,
      tanggal: t.createdAt,
      kasir: t.user.name,
      total: Number(t.total),
    }));

    return NextResponse.json({
      data,
      ringkasan: {
        totalPenjualan: Number(ringkasan._sum.total ?? 0),
        jumlahTransaksi: ringkasan._count,
        rataRata:
          ringkasan._count > 0
            ? Number(ringkasan._sum.total ?? 0) / ringkasan._count
            : 0,
      },
    });
  } catch (error) {
    console.error("GET /api/laporan error:", error);
    return NextResponse.json({ error: "Gagal mengambil laporan" }, { status: 500 });
  }
}
