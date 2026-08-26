import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [transaksiHariIni, totalPenjualan, produkTerlaris, totalProduk] =
    await Promise.all([
      prisma.transaksi.count({
        where: { createdAt: { gte: today }, userId: Number(session?.user?.id) || undefined },
      }),
      prisma.transaksi.aggregate({
        where: { createdAt: { gte: today } },
        _sum: { total: true },
      }),
      prisma.detailTransaksi.groupBy({
        by: ["produkId"],
        _sum: { jumlah: true },
        orderBy: { _sum: { jumlah: "desc" } },
        take: 5,
      }),
      prisma.produk.count(),
    ]);

    // Get product names for best sellers
  const produkIds = produkTerlaris.map((p) => p.produkId);
  const produks = await prisma.produk.findMany({
    where: { id: { in: produkIds } },
  });
  const produkMap = new Map(produks.map((p) => [p.id, p]));

  const stats = [
    {
      label: "Penjualan Hari Ini",
      value: `Rp ${(totalPenjualan._sum.total ?? 0).toLocaleString("id-ID")}`,
      color: "text-green-600",
    },
    {
      label: "Transaksi Saya Hari Ini",
      value: transaksiHariIni.toString(),
      color: "text-blue-600",
    },
    {
      label: "Total Produk",
      value: totalProduk.toString(),
      color: "text-purple-600",
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <Link
          href="/transaksi"
          className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
        >
          + Transaksi Baru
        </Link>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl shadow-sm p-6 border border-gray-100"
          >
            <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Produk Terlaris */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">
          Produk Terlaris (Top 5)
        </h2>

        {produkTerlaris.length === 0 ? (
          <p className="text-gray-500 text-sm">Belum ada penjualan.</p>
        ) : (
          <div className="space-y-3">
            {produkTerlaris.map((item, index) => {
              const produk = produkMap.get(item.produkId);
              return (
                <div
                  key={item.produkId}
                  className="flex items-center gap-4 py-2 border-b border-gray-50 last:border-0"
                >
                  <span className="w-7 h-7 flex items-center justify-center bg-blue-100 text-blue-600 rounded-full text-sm font-bold">
                    {index + 1}
                  </span>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">
                      {produk?.nama ?? `Produk #${item.produkId}`}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-gray-600">
                    {item._sum.jumlah ?? 0} terjual
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
