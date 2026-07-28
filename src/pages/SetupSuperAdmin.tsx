import { useState, useEffect } from "react";
import { doc, setDoc, getDoc, collection, getDocs } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { KEGIATAN_CONTENT } from "@/content/kegiatanContent";

export function SetupSuperAdmin() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [nama, setNama] = useState("Luay Gitaris");

  // State untuk Kegiatan Editor
  const [kegiatanList, setKegiatanList] = useState<any[]>([]);
  const [editingKegiatan, setEditingKegiatan] = useState<any | null>(null);
  const [jsonInput, setJsonInput] = useState("");

  useEffect(() => {
    loadKegiatan();
  }, []);

  // SetupSuperAdmin.tsx - Perbaiki loadKegiatan

  const loadKegiatan = async () => {
    try {
      const snap = await getDocs(collection(db, "kegiatan"));
      const data = snap.docs.map((d) => {
        const docData = d.data();
        return {
          id: d.id,
          ...docData,
          // Pastikan nomor ada, jika tidak gunakan default
          nomor: docData.nomor || parseInt(d.id.split("-")[1] || "0"),
        };
      });
      // Sort by nomor if exists
      data.sort((a, b) => (a.nomor || 0) - (b.nomor || 0));
      setKegiatanList(data);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleSetup = async () => {
    if (!user) {
      toast("Anda harus login terlebih dahulu", "error");
      return;
    }

    setLoading(true);
    try {
      // Cek apakah profile sudah ada
      const profileDoc = await getDoc(doc(db, "profiles", user.uid));

      if (profileDoc.exists()) {
        toast("Profile sudah ada", "warning");
        return;
      }

      // Buat profile baru dengan role super_admin
      await setDoc(doc(db, "profiles", user.uid), {
        id: user.uid,
        nama: nama,
        role: "super_admin",
        email: user.email,
        username: null,
        nisn: null,
        kelas_id: null,
        status: "active",
        dibuat_pada: new Date().toISOString(),
      });

      toast(
        "Super admin berhasil dibuat! Silakan login di /super-admin/login",
        "success",
      );

      // Redirect ke halaman super admin login setelah 2 detik
      setTimeout(() => {
        window.location.href = "/super-admin/login";
      }, 2000);
    } catch (err: any) {
      console.error(err);
      toast(err.message || "Gagal membuat super admin", "error");
    } finally {
      setLoading(false);
    }
  };

  // Add this helper function before the component
  function convertToFirestoreCompatible(data: any): any {
    if (data === null || data === undefined) {
      return data;
    }

    if (Array.isArray(data)) {
      // Check if array contains only primitive values
      if (data.every((item) => typeof item !== "object" || item === null)) {
        return data;
      }

      // For arrays of objects, convert each item
      return data.map((item) => convertToFirestoreCompatible(item));
    }

    if (typeof data === "object") {
      const result: any = {};

      for (const [key, value] of Object.entries(data)) {
        // Skip non-serializable values
        if (typeof value === "function" || value === undefined) {
          continue;
        }

        // Handle specific fields that might have nested arrays
        if (key === "rows" && Array.isArray(value)) {
          // Convert rows to array of objects if they contain arrays
          result[key] = value.map((row) => {
            if (Array.isArray(row)) {
              // Convert array row to object
              const rowObj: any = {};
              row.forEach((cell, idx) => {
                rowObj[`col_${idx}`] = convertToFirestoreCompatible(cell);
              });
              return rowObj;
            }
            return convertToFirestoreCompatible(row);
          });
        } else if (key === "options" && Array.isArray(value)) {
          // Keep options as array of objects (Firestore supports this)
          result[key] = value.map((opt) => convertToFirestoreCompatible(opt));
        } else if (key === "sdg" && Array.isArray(value)) {
          // Keep SDG as array of objects
          result[key] = value.map((sdg) => convertToFirestoreCompatible(sdg));
        } else if (Array.isArray(value)) {
          // For other arrays, check if they contain nested arrays
          if (value.some((item) => Array.isArray(item))) {
            result[key] = value.map((item) => {
              if (Array.isArray(item)) {
                // Convert nested array to object
                const obj: any = {};
                item.forEach((val, idx) => {
                  obj[`item_${idx}`] = convertToFirestoreCompatible(val);
                });
                return obj;
              }
              return convertToFirestoreCompatible(item);
            });
          } else {
            result[key] = convertToFirestoreCompatible(value);
          }
        } else if (typeof value === "object" && value !== null) {
          // Recursively convert nested objects
          result[key] = convertToFirestoreCompatible(value);
        } else {
          result[key] = value;
        }
      }

      return result;
    }

    return data;
  }

  // Then update your handleSeedKegiatan function
  const handleSeedKegiatan = async () => {
    setLoading(true);
    try {
      for (const k of KEGIATAN_CONTENT) {
        const docRef = doc(db, "kegiatan", `kegiatan-${k.nomor}`);

        // Convert the data to Firestore-compatible format
        const firestoreData = convertToFirestoreCompatible(k);

        // Verify the data is compatible
        try {
          await setDoc(docRef, firestoreData);
          console.log(`Successfully uploaded kegiatan-${k.nomor}`);
        } catch (error) {
          console.error(`Failed to upload kegiatan-${k.nomor}:`, error);
          // If it fails, try with a simplified version
          const simplifiedData = simplifyForFirestore(k);
          await setDoc(docRef, simplifiedData);
        }
      }
      toast("Data kegiatan berhasil dimigrasi ke Firebase", "success");
      loadKegiatan();
    } catch (err: any) {
      console.error(err);
      toast(err.message || "Gagal migrasi data", "error");
    } finally {
      setLoading(false);
    }
  };

  // Fallback function if the conversion still fails
  function simplifyForFirestore(data: any): any {
    const result: any = {
      nomor: data.nomor,
      judul: data.judul,
      subjudul: data.subjudul,
      warna: data.warna,
      warnaLight: data.warnaLight,
      sdg: data.sdg || [],
      cakupanMateri: data.cakupanMateri || [],
      tujuan: data.tujuan || [],
      materi: data.materi || "",
    };

    // Simplify steps
    result.steps = data.steps.map((step: any) => ({
      id: step.id,
      sintaks: step.sintaks,
      label: step.label,
      ringkas: step.ringkas,
      blocks: step.blocks.map((block: any) => {
        const simpleBlock: any = { kind: block.kind };

        // Only include primitive values and non-nested arrays
        for (const [key, value] of Object.entries(block)) {
          if (
            typeof value === "string" ||
            typeof value === "number" ||
            typeof value === "boolean"
          ) {
            simpleBlock[key] = value;
          } else if (Array.isArray(value)) {
            // Check if array contains only primitives
            if (
              value.every((item) => typeof item !== "object" || item === null)
            ) {
              simpleBlock[key] = value;
            } else {
              // Convert complex arrays to JSON string
              simpleBlock[key] = JSON.stringify(value);
            }
          } else if (value && typeof value === "object") {
            // Convert objects to JSON string
            simpleBlock[key] = JSON.stringify(value);
          }
        }

        return simpleBlock;
      }),
    }));

    return result;
  }

  // function convertBlockToFirestore(block: any): any {
  //   const result: any = { kind: block.kind };

  //   for (const [key, value] of Object.entries(block)) {
  //     if (key === "kind") continue;

  //     if (key === "rows" && Array.isArray(value)) {
  //       // Convert rows to array of objects
  //       result[key] = value.map((row: any) => {
  //         if (Array.isArray(row)) {
  //           const rowObj: any = {};
  //           row.forEach((cell, idx) => {
  //             rowObj[`col_${idx}`] = cell;
  //           });
  //           return rowObj;
  //         }
  //         return row;
  //       });
  //     } else if (key === "options" && Array.isArray(value)) {
  //       // Keep options as array of objects (Firestore supports this)
  //       result[key] = value;
  //     } else if (key === "sdg" && Array.isArray(value)) {
  //       // Keep SDG as array of objects
  //       result[key] = value;
  //     } else if (
  //       Array.isArray(value) &&
  //       value.every((item) => typeof item !== "object")
  //     ) {
  //       // Keep primitive arrays
  //       result[key] = value;
  //     } else if (typeof value === "object" && value !== null) {
  //       // Recursively convert nested objects
  //       result[key] = convertToFirestoreCompatible(value);
  //     } else {
  //       result[key] = value;
  //     }
  //   }

  //   return result;
  // }

  const handleEditClick = (k: any) => {
    setEditingKegiatan(k);
    // Remove 'id' from JSON to avoid accidentally updating it in the document data
    const { id, ...dataToEdit } = k;
    setJsonInput(JSON.stringify(dataToEdit, null, 2));
  };

  const handleSaveJson = async () => {
    if (!editingKegiatan) return;
    setLoading(true);
    try {
      const parsed = JSON.parse(jsonInput);
      await setDoc(doc(db, "kegiatan", editingKegiatan.id), parsed);
      toast("Kegiatan berhasil diperbarui di Firebase", "success");
      setEditingKegiatan(null);
      loadKegiatan();
    } catch (err: any) {
      toast("JSON tidak valid atau gagal menyimpan: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-900 via-purple-800 to-slate-900 px-4 py-12">
      <div className="w-full max-w-md mb-8">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-slate-800">
              Setup Super Admin Pertama
            </h1>
            <p className="text-sm text-slate-500 mt-2">
              Buat profile super admin untuk email yang sudah login
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={user?.email || ""}
                disabled
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-slate-100 text-slate-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Nama
              </label>
              <input
                type="text"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition"
                placeholder="Nama lengkap"
              />
            </div>

            <button
              onClick={handleSetup}
              disabled={loading}
              className="w-full bg-purple-600 text-white py-2.5 rounded-lg font-medium hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? "Memproses..." : "Buat Super Admin"}
            </button>
          </div>
        </div>
      </div>

      <div className="w-full max-w-4xl">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">
                Kelola Data Kegiatan
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Migrasi dan edit data JSON konten kegiatan
              </p>
            </div>
            <button
              onClick={handleSeedKegiatan}
              disabled={loading}
              className="mt-4 sm:mt-0 bg-brand-green text-white px-4 py-2 rounded-lg font-medium hover:bg-brand-green-dark transition disabled:opacity-50">
              Migrasi Data Kegiatan (Seeding)
            </button>
          </div>

          {!editingKegiatan ? (
            <div className="space-y-3">
              {kegiatanList.length === 0 ? (
                <p className="text-slate-500 text-sm py-4">
                  Belum ada data kegiatan di Firestore. Silakan klik tombol
                  migrasi.
                </p>
              ) : (
                kegiatanList.map((k) => (
                  <div
                    key={k.id}
                    className="flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition">
                    <div>
                      <h3 className="font-semibold text-slate-800">
                        Kegiatan {k.nomor}: {k.judul}
                      </h3>
                      <p className="text-xs text-slate-500">
                        Document ID: {k.id}
                      </p>
                    </div>
                    <button
                      onClick={() => handleEditClick(k)}
                      className="px-3 py-1.5 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 font-medium transition">
                      Edit JSON
                    </button>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-slate-800">
                  Mengedit: {editingKegiatan.id}
                </h3>
                <button
                  onClick={() => setEditingKegiatan(null)}
                  className="text-sm text-slate-500 hover:text-slate-700">
                  Batal
                </button>
              </div>
              <p className="text-xs text-slate-500 bg-blue-50 p-3 rounded-lg border border-blue-100">
                Gunakan editor teks JSON di bawah untuk memodifikasi struktur
                kegiatan. Untuk menambahkan media YouTube, tambahkan field{" "}
                <code className="bg-white px-1 py-0.5 rounded text-blue-600">
                  mediaUrl: "URL_YOUTUBE"
                </code>{" "}
                dan{" "}
                <code className="bg-white px-1 py-0.5 rounded text-blue-600">
                  mediaType: "youtube"
                </code>{" "}
                pada block stimulus atau masalah.
              </p>
              <textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                className="w-full h-[500px] font-mono text-sm p-4 border border-slate-300 rounded-xl focus:border-purple-500 outline-none"
              />
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setEditingKegiatan(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50">
                  Batal
                </button>
                <button
                  onClick={handleSaveJson}
                  disabled={loading}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50">
                  {loading ? "Menyimpan..." : "Simpan JSON"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
