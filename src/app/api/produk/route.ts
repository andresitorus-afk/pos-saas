import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/produk - list semua produk (dengan search & filter)
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const kategoriId = searchParams.get("kategoriId");

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { nama: { contains: search } },
        { barcode: { contains: search } },
      ];
    }

    if (kategoriId) {
      where.kategoriId = Number(kategoriId);
    }

    const produks = await prisma.produk.findMany({
      where,
      include: { kategori: true },
      orderBy: { nama: "asc" },
    });

    // Serialize Decimal to number
    const data = produks.map((p) => ({
      ...p,
      harga: Number(p.harga),
    }));

    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/produk error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data produk" },
      { status: 500 }
    );
  }
}

// POST /api/produk - tambah produk baru
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { nama, barcode, harga, stok, kategoriId, gambar } = body;

    if (!nama || !harga || !kategoriId) {
      return NextResponse.json(
        { error: "Nama, harga, dan kategori wajib diisi" },
        { status: 400 }
      );
    }

    const produk = await prisma.produk.create({
      data: {
        nama,
        barcode: barcode || null,
        harga: Number(harga),
        stok: Number(stok) || 0,
        kategoriId: Number(kategoriId),
        gambar: gambar || null,
      },
    });

    return NextResponse.json(
      { ...produk, harga: Number(produk.harga) },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/produk error:", error);
    return NextResponse.json(
      { error: "Gagal menambah produk" },
      { status: 500 }
    );
  }
}
