import React, { useState } from "react";

const transmissions = [
  { ref: "#TX-98234-A", patient: "Amira Hadj", date: "12/05/2024", type: "Consultation complète", status: "Réussi", code: "green", docs: 4 },
  { ref: "#TX-98112-B", patient: "Karim Benali", date: "11/05/2024", type: "Ordonnance", status: "Réussi", code: "green", docs: 1 },
  { ref: "#TX-98045-C", patient: "Yasmine Cherif", date: "10/05/2024", type: "Demande de biologie", status: "En attente", code: "amber", docs: 2 },
  { ref: "#TX-97988-D", patient: "Omar Mansouri", date: "09/05/2024", type: "Consultation complète", status: "Réussi", code: "green", docs: 5 },
  { ref: "#TX-97901-E", patient: "Nadia Kaci", date: "08/05/2024", type: "Compte-rendu", status: "Échec", code: "red", docs: 1 },
];

const statusStyles = {
  green: "badge-green",
  amber: "badge-amber",
  red: "badge-red",
};

export default function ScreenHistory() {
  const [filter, setFilter] = useState("all");

  const filtered = transmissions.filter((t) => {
    if (filter === "all") return true;
    if (filter === "success") return t.code === "green";
    if (filter === "pending") return t.code === "amber";
    if (filter === "failed") return t.code === "red";
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="section-label mb-2">Traçabilité</div>
          <h1 className="text-3xl lg:text-4xl font-bold">Historique & Transmissions SIH</h1>
          <div className="gold-divider mt-3" />
          <p className="mt-3 text-[var(--text-muted)] text-sm">Journal complet des validations médicales et transmissions.</p>
        </div>
        <button className="btn-primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
          Exporter le journal
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: "all", label: "Tous" },
          { key: "success", label: "Réussis" },
          { key: "pending", label: "En attente" },
          { key: "failed", label: "Échecs" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition cursor-pointer ${
              filter === f.key
                ? "bg-[var(--primary-navy)] text-white border-[var(--primary-navy)]"
                : "bg-white text-[var(--text-muted)] border-[var(--border-soft)] hover:border-[var(--gold)]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="luxury-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--bg-app)] text-left text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
                <th className="px-6 py-4 font-semibold">Référence</th>
                <th className="px-6 py-4 font-semibold">Patient</th>
                <th className="px-6 py-4 font-semibold">Date</th>
                <th className="px-6 py-4 font-semibold">Type</th>
                <th className="px-6 py-4 font-semibold">Documents</th>
                <th className="px-6 py-4 font-semibold">Statut</th>
                <th className="px-6 py-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-soft)]">
              {filtered.map((t) => (
                <tr key={t.ref} className="hover:bg-[var(--bg-app)] transition">
                  <td className="px-6 py-4 font-semibold text-[var(--info)]">{t.ref}</td>
                  <td className="px-6 py-4 text-[var(--text-heading)] font-medium">{t.patient}</td>
                  <td className="px-6 py-4 text-[var(--text-muted)]">{t.date}</td>
                  <td className="px-6 py-4 text-[var(--text-heading)]">{t.type}</td>
                  <td className="px-6 py-4"><span className="lux-badge badge-blue">{t.docs}</span></td>
                  <td className="px-6 py-4"><span className={`lux-badge ${statusStyles[t.code]}`}>{t.status}</span></td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-xs font-semibold text-[var(--info)] hover:text-[var(--gold-dark)] cursor-pointer">Détails →</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
