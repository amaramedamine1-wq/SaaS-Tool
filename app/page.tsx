"use client";

import Sidebar from "@/components/ui/sidebar";
import AIChat from "@/components/ui/ai-chat";
import { FC } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";

// Desktop Sidebar (improved spacing, typography, focus styles)
const DesktopSidebar: FC = () => (
  <aside className="hidden md:flex flex-col fixed top-0 left-0 w-64 h-screen bg-white shadow-xl border-r border-gray-200 p-8">
    <h2 className="text-3xl font-bold tracking-tight mb-10">Menü</h2>
    <nav className="flex flex-col space-y-5 text-lg font-medium">
      <a href="#hero" className="hover:text-indigo-600 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-2">Home</a>
      <a href="#menu" className="hover:text-indigo-600 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-2">Menu</a>
      <a href="#ai" className="hover:text-indigo-600 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-2">Empfehlungen</a>
      <a href="#videos" className="hover:text-indigo-600 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-2">Videos</a>
      <a href="#contact" className="hover:text-indigo-600 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-2">Kontakt</a>
    </nav>
  </aside>
);

// Main Page
export default function LandingPage() {
  const { data: session, isPending } = authClient.useSession();

  const onLogout = async () => {
    await authClient.signOut();
    window.location.href = "/login";
  };

  return (
    <>
      <Sidebar />
      <DesktopSidebar />

      <main className="ml-0 md:ml-64">
        <div className="fixed top-4 right-4 z-50 flex items-center gap-3">
          {session?.user?.role === "admin" ? (
            <Link href="/admin" className="bg-white border border-gray-300 rounded-xl px-4 py-2 text-sm">
              Admin
            </Link>
          ) : null}
          {!isPending && session ? (
            <button
              onClick={onLogout}
              className="bg-black text-white rounded-xl px-4 py-2 text-sm font-semibold"
            >
              Logout
            </button>
          ) : null}
        </div>

        {/* HERO */}
        <section id="hero" className="relative h-screen overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black flex items-center justify-center text-white px-6 text-center">
            <h1 className="text-6xl md:text-7xl font-extrabold tracking-tight leading-tight max-w-3xl">
              Willkommen im Restaurant
            </h1>
          </div>
        </section>

        {/* MENU */}
        <section id="menu" className="py-24 px-8 bg-gray-50">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-5xl font-bold text-center tracking-tight mb-16">
              Unsere Spezialitäten
            </h2>

            <div className="grid md:grid-cols-3 gap-10">
              {[{
                title: "Pasta Carbonara",
                desc: "Klassische italienische Pasta mit frischen Zutaten."
              },{
                title: "Vegane Bowl",
                desc: "Frische, gesunde Zutaten – ideal für Veganer."
              },{
                title: "Signature Burger",
                desc: "Saftig, lecker und nur bei uns erhältlich."
              }].map((item) => (
                <div key={item.title} className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
                  <h3 className="text-3xl font-semibold mb-4">{item.title}</h3>
                  <p className="text-gray-600 text-lg leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* AI CHAT */}
        <section id="ai" className="py-24 px-8 bg-white border-t border-gray-200">
          <h2 className="text-5xl font-bold text-center tracking-tight mb-16">
            AI Menü-Assistent
          </h2>
          <div className="max-w-4xl mx-auto">
            <AIChat />
          </div>
        </section>

        {/* VIDEOS */}
        <section id="videos" className="py-24 px-8 bg-gray-50 border-t border-gray-200">
          <h2 className="text-5xl font-bold text-center tracking-tight mb-10">Videos</h2>
          <p className="text-center text-gray-500 text-lg max-w-xl mx-auto">
            Füge hier Videos ein, wenn welche vorhanden sind.
          </p>
        </section>

        {/* CONTACT */}
        <section id="contact" className="py-24 px-8 bg-white border-t border-gray-200">
          <h2 className="text-5xl font-bold text-center tracking-tight mb-16">
            Kontakt & Reservierung
          </h2>

          <form className="max-w-2xl mx-auto grid gap-8">
            <input type="text" placeholder="Name" className="border border-gray-300 p-4 rounded-xl w-full focus:ring-2 focus:ring-indigo-500" />
            <input type="email" placeholder="Email" className="border border-gray-300 p-4 rounded-xl w-full focus:ring-2 focus:ring-indigo-500" />
            <textarea placeholder="Nachricht" rows={6} className="border border-gray-300 p-4 rounded-xl w-full focus:ring-2 focus:ring-indigo-500"></textarea>

            <button className="bg-indigo-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-indigo-700 transition-colors">
              Senden
            </button>
          </form>
        </section>

      </main>
    </>
  );
}
