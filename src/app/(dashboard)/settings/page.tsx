"use client";

import { useState, useEffect } from "react";

export default function SettingsPage() {
  const [form, setForm] = useState({
    namaToko: "",
    alamat: "",
    noTelp: "",
    footer: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadSetting();
  }, []);

  const loadSetting = async () => {
    try {
      const res = await fetch("/api/setting");
      if (res.ok) {
        const data = await res.json();
        setForm({
          namaToko: data.namaToko ?? "",
          alamat: data.alamat ?? "",
          noTelp: data.noTelp ?? "",
          footer: data.footer ?? "",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const res = await fetch("/api/setting", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        setMessage("Pengaturan berhasil disimpan");
      } else {
        const data = await res.json();
        setMessage(data.error || "Gagal menyimpan");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-10 text-gray-500">Loading...</div>;
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        Pengaturan Toko
      </h1>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nama Toko
          </label>
          <input
            type="text"
            required
            value={form.namaToko}
            onChange={(e) => setForm({ ...form, namaToko: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Alamat
          </label>
          <textarea
            rows={2}
            value={form.alamat}
            onChange={(e) => setForm({ ...form, alamat: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            No. Telepon
          </label>
          <input
            type="text"
            value={form.noTelp}
            onChange={(e) => setForm({ ...form, noTelp: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Footer Struk
          </label>
          <textarea
            rows={2}
            value={form.footer}
            onChange={(e) => setForm({ ...form, footer: e.target.value })}
            placeholder="Pesanan di bagian bawah struk"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {message && (
          <div
            className={`text-sm rounded-lg px-4 py-2 ${
              message.includes("berhasil")
                ? "text-green-700 bg-green-50 border border-green-200"
                : "text-red-600 bg-red-50 border border-red-200"
            }`}
          >
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors cursor-pointer"
        >
          {saving ? "Menyimpan..." : "Simpan Pengaturan"}
        </button>
      </form>
    </div>
  );
}
