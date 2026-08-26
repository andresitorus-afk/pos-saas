import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/produk/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const produk = await prisma.produk.findUnique({
      where: { id: Number(id) },
      include: { kategori: true },
    });

    if (!produk) {
      return NextResponse.json({ error: "Produk tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ ...produk, harga: Number(produk.harga) });
  } catch (error) {
    console.error("GET /api/produk/[id] error:", error);
    return NextResponse.json({ error: "Gagal mengambil produk" }, { status: 500 });
  }
}

// PUT /api/produk/[id] - edit produk
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { nama, barcode, harga, stok, kategoriId, gambar } = body;

    const produk = await prisma.produk.update({
      where: { id: Number(id) },
      data: {
        ...(nama !== undefined && { nama }),
        ...(barcode !== undefined && { barcode: barcode || null }),
        ...(harga !== undefined && { harga: Number(harga) }),
        ...(stok !== undefined && { stok: Number(stok) }),
        ...(kategoriId !== undefined && { kategoriId: Number(kategoriId) }),
        ...(gambar !== undefined && { gambar: gambar || null }),
      },
    });

    return NextResponse.json({ ...produk, harga: Number(produk.harga) });
  } catch (error) {
    console.error("PUT /api/produk/[id] error:", error);
    return NextResponse.json({ error: "Gagal update produk" }, { status: 500 });
  }
}

// DELETE /api/produk/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // Check if product has transaction history
    const detailCount = await prisma.detailTransaksi.count({
      where: { produkId: Number(id) },
    });

    if (detailCount > 0) {
      return NextResponse.json(
        { error: "Produk sudah memiliki riwayat transaksi, tidak bisa dihapus" },
        { status: 400 }
      );
    }

    await prisma.produk.delete({ where: { id: Number(id) } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/produk/[id] error:", error);
    return NextResponse.json({ error: "Gagal hapus produk" }, { status: 500 });
  }
}
