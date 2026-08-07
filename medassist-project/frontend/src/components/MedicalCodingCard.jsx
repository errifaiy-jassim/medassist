import React, { useState, useEffect } from "react";

export default function MedicalCodingCard() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  useEffect(() => {
    const handleAutoUpdate = (event) => {
      setResults(event.detail);
    };
    window.addEventListener("updateCodingResults", handleAutoUpdate);
    return () => window.removeEventListener("updateCodingResults", handleAutoUpdate);
  }, []);

  const handleRunCoding = async () => {
    setLoading(true);
    try {
      const response = await fetch("http://localhost:8000/api/v1/coding/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          diagnostics: ["Hypertension artérielle"],
          prescriptions: ["Metformine 850mg"],
          biology: ["Glycémie à jeun"],
        }),
      });
      const data = await response.json();
      setResults(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const renderBadge = (status) => {
    const isConfirmed = status === "Confirmed";
    return (
      <span
        style={{
          padding: "4px 10px",
          borderRadius: "12px",
          fontSize: "12px",
          fontWeight: "600",
          backgroundColor: isConfirmed ? "#E6F4EA" : "#FEF7E0",
          color: isConfirmed ? "#137333" : "#B06000",
        }}
      >
        {isConfirmed ? "Confirmé" : "À confirmer"}
      </span>
    );
  };

  return (
    <div
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: "16px",
        padding: "24px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
        border: "1px solid #E2E8F0",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
          <h2 style={{ fontSize: "18px", fontWeight: "700", color: "#0F172A", margin: 0 }}>
            Codification Automatique (CIM-10, GMR, NABM)
          </h2>
          <p style={{ fontSize: "14px", color: "#64748B", margin: "4px 0 0 0" }}>
            Extrait en temps réel depuis le moteur PostgreSQL / FastAPI
          </p>
        </div>
        <button
          onClick={handleRunCoding}
          disabled={loading}
          style={{
            padding: "10px 20px",
            backgroundColor: "#2563EB",
            color: "#FFFFFF",
            border: "none",
            borderRadius: "8px",
            fontWeight: "600",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Codification..." : "Lancer la codification"}
        </button>
      </div>

      {results && (
        <div style={{ display: "grid", gap: "16px" }}>
          <div style={{ padding: "16px", backgroundColor: "#F8FAFC", borderRadius: "12px", border: "1px solid #E2E8F0" }}>
            <h3 style={{ fontSize: "12px", color: "#64748B", textTransform: "uppercase", marginTop: 0 }}>
              Diagnostics (CIM-10)
            </h3>
            {results.diagnostics_icd10.map((item, idx) => (
              <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div><strong style={{ color: "#2563EB", fontSize: "15px" }}>{item.code}</strong> — {item.label}</div>
                {renderBadge(item.status)}
              </div>
            ))}
          </div>

          <div style={{ padding: "16px", backgroundColor: "#F8FAFC", borderRadius: "12px", border: "1px solid #E2E8F0" }}>
            <h3 style={{ fontSize: "12px", color: "#64748B", textTransform: "uppercase", marginTop: 0 }}>
              Prescriptions (GMR)
            </h3>
            {results.prescriptions_gmr.map((item, idx) => (
              <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div><strong style={{ color: "#2563EB", fontSize: "15px" }}>{item.code}</strong> — {item.label}</div>
                {renderBadge(item.status)}
              </div>
            ))}
          </div>

          <div style={{ padding: "16px", backgroundColor: "#F8FAFC", borderRadius: "12px", border: "1px solid #E2E8F0" }}>
            <h3 style={{ fontSize: "12px", color: "#64748B", textTransform: "uppercase", marginTop: 0 }}>
              Actes de Biologie (NABM)
            </h3>
            {results.biology_nabm.map((item, idx) => (
              <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div><strong style={{ color: "#2563EB", fontSize: "15px" }}>{item.code}</strong> — {item.label}</div>
                {renderBadge(item.status)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}