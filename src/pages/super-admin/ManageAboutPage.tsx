import { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, type AboutPageContent } from "@/lib/firebase";
import { useToast } from "@/context/ToastContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Save, Plus, Trash2, FileText, LayoutDashboard, Clock, Users, BookOpen, Activity, Shield } from "lucide-react";

// Sesuaikan navItems dengan app Anda
const navItems = [
  {
    to: "/super-admin",
    label: "Menunggu",
    icon: <Clock className="h-5 w-5" />,
  },
  {
    to: "/super-admin?tab=profiles",
    label: "Profiles",
    icon: <Users className="h-5 w-5" />,
  },
  {
    to: "/super-admin?tab=kelas",
    label: "Kelas",
    icon: <BookOpen className="h-5 w-5" />,
  },
  {
    to: "/super-admin?tab=jawaban",
    label: "Jawaban",
    icon: <FileText className="h-5 w-5" />,
  },
  {
    to: "/super-admin?tab=kegiatan",
    label: "Kegiatan",
    icon: <Activity className="h-5 w-5" />,
  },
  {
    to: "/super-admin?tab=admins",
    label: "Super Admins",
    icon: <Shield className="h-5 w-5" />,
  },
  {
    to: "/super-admin?tab=landing",
    label: "Konten Landing Page",
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    to: "/super-admin/questions",
    label: "Kelola Soal",
    icon: <FileText className="h-5 w-5" />,
  },
  {
    to: "/super-admin/about",
    label: "Kelola About",
    icon: <FileText className="h-5 w-5" />,
  },
];

const EMPTY: Omit<AboutPageContent, "id"> = {
  badge: "Tentang Produk",
  deskripsi_1: "",
  deskripsi_2: "",
  approaches: [
    { title: "Problem Based Learning", description: "" },
    { title: "Education for Sustainable Development", description: "" },
    { title: "Argumentasi TAP", description: "" },
    { title: "E-Assessment Eksternal", description: "" },
  ],
  role_siswa_items: [""],
  role_guru_items: [""],
  kegiatan_section_title: "Kegiatan Belajar",
  diperbarui_pada: "",
};

export function ManageAboutPage() {
  const { toast } = useToast();
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, "about_page", "default"));
        if (snap.exists()) {
          const data = snap.data();
          setForm({
            badge: data.badge || EMPTY.badge,
            deskripsi_1: data.deskripsi_1 || "",
            deskripsi_2: data.deskripsi_2 || "",
            approaches:
              Array.isArray(data.approaches) && data.approaches.length
                ? data.approaches
                : EMPTY.approaches,
            role_siswa_items: Array.isArray(data.role_siswa_items)
              ? data.role_siswa_items
              : [""],
            role_guru_items: Array.isArray(data.role_guru_items)
              ? data.role_guru_items
              : [""],
            kegiatan_section_title:
              data.kegiatan_section_title || EMPTY.kegiatan_section_title,
            diperbarui_pada: data.diperbarui_pada || "",
          });
        }
      } catch (err) {
        console.error(err);
        toast("Gagal memuat konten About", "error");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, "about_page", "default"), {
        ...form,
        role_siswa_items: form.role_siswa_items
          .map((s) => s.trim())
          .filter(Boolean),
        role_guru_items: form.role_guru_items
          .map((s) => s.trim())
          .filter(Boolean),
        diperbarui_pada: new Date().toISOString(),
      });
      toast("Konten About berhasil disimpan", "success");
    } catch (err: any) {
      toast(err.message || "Gagal menyimpan", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout items={navItems} role="super_admin">
        <div className="card animate-pulse h-40" />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout items={navItems} role="super_admin">
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Kelola Halaman About
            </h1>
            <p className="text-sm text-slate-500">
              Ubah teks deskripsi, pendekatan, dan peran. Daftar kegiatan
              diambil otomatis dari koleksi <code>kegiatan</code>.
            </p>
          </div>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="btn-primary">
            <Save className="h-4 w-4" />
            {saving ? "Menyimpan…" : "Simpan"}
          </button>
        </div>

        <div className="card space-y-3">
          <label className="block">
            <span className="label-base">Badge</span>
            <input
              className="input-base"
              value={form.badge}
              onChange={(e) =>
                setForm((f) => ({ ...f, badge: e.target.value }))
              }
            />
          </label>
          <label className="block">
            <span className="label-base">Judul section kegiatan</span>
            <input
              className="input-base"
              value={form.kegiatan_section_title}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  kegiatan_section_title: e.target.value,
                }))
              }
              placeholder="Contoh: 4 Kegiatan Belajar"
            />
          </label>
          <label className="block">
            <span className="label-base">Deskripsi paragraf 1</span>
            <textarea
              className="input-base"
              rows={4}
              value={form.deskripsi_1}
              onChange={(e) =>
                setForm((f) => ({ ...f, deskripsi_1: e.target.value }))
              }
            />
          </label>
          <label className="block">
            <span className="label-base">Deskripsi paragraf 2</span>
            <textarea
              className="input-base"
              rows={3}
              value={form.deskripsi_2}
              onChange={(e) =>
                setForm((f) => ({ ...f, deskripsi_2: e.target.value }))
              }
            />
          </label>
        </div>

        <div className="card space-y-4">
          <p className="text-sm font-bold text-slate-800">Kartu Pendekatan</p>
          {form.approaches.map((a, i) => (
            <div
              key={i}
              className="rounded-xl border border-slate-200 p-3 space-y-2">
              <div className="flex justify-between gap-2">
                <input
                  className="input-base flex-1"
                  value={a.title}
                  onChange={(e) => {
                    const next = [...form.approaches];
                    next[i] = { ...next[i], title: e.target.value };
                    setForm((f) => ({ ...f, approaches: next }));
                  }}
                  placeholder="Judul"
                />
                <button
                  type="button"
                  className="btn-ghost text-red-500"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      approaches: f.approaches.filter((_, idx) => idx !== i),
                    }))
                  }>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <textarea
                className="input-base"
                rows={2}
                value={a.description}
                onChange={(e) => {
                  const next = [...form.approaches];
                  next[i] = { ...next[i], description: e.target.value };
                  setForm((f) => ({ ...f, approaches: next }));
                }}
                placeholder="Deskripsi"
              />
            </div>
          ))}
          <button
            type="button"
            className="btn-outline w-full"
            onClick={() =>
              setForm((f) => ({
                ...f,
                approaches: [...f.approaches, { title: "", description: "" }],
              }))
            }>
            <Plus className="h-4 w-4" /> Tambah pendekatan
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <ListEditor
            title="Peran Siswa"
            items={form.role_siswa_items}
            onChange={(items) =>
              setForm((f) => ({ ...f, role_siswa_items: items }))
            }
          />
          <ListEditor
            title="Peran Guru"
            items={form.role_guru_items}
            onChange={(items) =>
              setForm((f) => ({ ...f, role_guru_items: items }))
            }
          />
        </div>
      </div>
    </DashboardLayout>
  );
}

function ListEditor({
  title,
  items,
  onChange,
}: {
  title: string;
  items: string[];
  onChange: (items: string[]) => void;
}) {
  return (
    <div className="card space-y-2">
      <p className="text-sm font-bold text-slate-800">{title}</p>
      {items.map((it, i) => (
        <div key={i} className="flex gap-2">
          <input
            className="input-base flex-1"
            value={it}
            onChange={(e) => {
              const next = [...items];
              next[i] = e.target.value;
              onChange(next);
            }}
          />
          <button
            type="button"
            className="btn-ghost text-red-500"
            onClick={() => onChange(items.filter((_, idx) => idx !== i))}>
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        className="btn-outline w-full text-sm"
        onClick={() => onChange([...items, ""])}>
        <Plus className="h-3.5 w-3.5" /> Tambah item
      </button>
    </div>
  );
}
