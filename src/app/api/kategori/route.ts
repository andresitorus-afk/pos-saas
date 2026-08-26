import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/kategori
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const kategoris = await prisma.kategori.findMany({
      orderBy: { nama: "asc" },
    });

    return NextResponse.json(kategoris);
  } catch (error) {
    console.error("GET /api/kategori error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil kategori" },
      { status: 500 }
    );
  }
}

// POST /api/kategori
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { nama } = await req.json();

    if (!nama) {
      return NextResponse.json({ error: "Nama kategori wajib diisi" }, { status: 400 });
    }

    const kategori = await prisma.kategori.create({ data: { nama } });

    return NextResponse.json(kategori, { status: 201 });
  } catch (error) {
    console.error("POST /api/kategori error:", error);
    return NextResponse.json({ error: "Gagal menambah kategori" }, { status: 500 });
  }
}
