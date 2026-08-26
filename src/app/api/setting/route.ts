import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/setting
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let setting = await prisma.setting.findFirst();

    // Create default if not exists
    if (!setting) {
      setting = await prisma.setting.create({
        data: {
          namaToko: "Toko Saya",
          alamat: "",
          noTelp: "",
          footer: "Terima kasih atas kunjungan Anda!",
        },
      });
    }

    return NextResponse.json(setting);
  } catch (error) {
    console.error("GET /api/setting error:", error);
    return NextResponse.json({ error: "Gagal mengambil setting" }, { status: 500 });
  }
}

// PUT /api/setting
export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { namaToko, alamat, noTelp, footer } = body;

    const existing = await prisma.setting.findFirst();

    const setting = existing
      ? await prisma.setting.update({
          where: { id: existing.id },
          data: { namaToko, alamat, noTelp, footer },
        })
      : await prisma.setting.create({
          data: { namaToko, alamat, noTelp, footer },
        });

    return NextResponse.json(setting);
  } catch (error) {
    console.error("PUT /api/setting error:", error);
    return NextResponse.json({ error: "Gagal update setting" }, { status: 500 });
  }
}
