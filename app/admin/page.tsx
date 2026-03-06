import { requireAdmin } from "@/lib/auth-guard";

export default async function AdminPage() {
  const session = await requireAdmin();

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-lg p-8 space-y-4">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-gray-700">Angemeldet als: {session.user.email}</p>
        <p className="text-gray-700">
          Rolle: <span className="font-semibold">{session.user.role ?? "user"}</span>
        </p>
        <p className="text-sm text-gray-500">
          Nur Nutzer mit Rolle <code>admin</code> koennen diese Seite sehen.
        </p>
      </div>
    </main>
  );
}
