import React, { useEffect, useState } from "react";
import Screen1Login from "./pages/Screen1Login";
import Screen2Dashboard from "./pages/Screen2Dashboard";
import Screen3Dictation from "./pages/Screen3Dictation";
import Screen4Validation from "./pages/Screen4Validation";
import Screen5Transmission from "./pages/Screen5Transmission";
import ScreenPatientDetail from "./pages/ScreenPatientDetail";
import ScreenHistory from "./pages/ScreenHistory";
import ScreenSettings from "./pages/ScreenSettings";
import ScreenOffline from "./pages/ScreenOffline";
import Layout from "./components/Layout";
import { OfflineBanner } from "./components/ApiState";
import useOnlineStatus from "./hooks/useOnlineStatus";
import {
  clearAuthSession,
  fetchCurrentUser,
  getStoredUser,
  isAuthenticated as hasToken,
  logout as apiLogout,
} from "./services/api";

const emptyWorkflow = () => ({
  consultationId: null,
  transcription: "",
  extracted: null,
  coding: null,
  status: "draft",
  transmissionId: null,
  transmissionTimestamp: null,
  transmissionOutcome: null,
  transmissionError: "",
});

export default function App() {
  const [currentScreen, setCurrentScreen] = useState("screen2");
  const [isAuthenticated, setIsAuthenticated] = useState(() => hasToken());
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [workflow, setWorkflow] = useState(emptyWorkflow);
  const [user, setUser] = useState(() => getStoredUser());
  const [patientsVisitKey, setPatientsVisitKey] = useState(0);
  const online = useOnlineStatus();

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    (async () => {
      try {
        const me = await fetchCurrentUser();
        if (!cancelled) setUser(me);
      } catch {
        if (!cancelled) {
          clearAuthSession();
          setIsAuthenticated(false);
          setUser(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const resetWorkflow = () => setWorkflow(emptyWorkflow());

  const navigateTo = (screen) => {
    if (screen === "patients") {
      setPatientsVisitKey((k) => k + 1);
    }
    setCurrentScreen(screen);
  };

  const handleLogout = async () => {
    try {
      await apiLogout();
    } catch {
      clearAuthSession();
    }
    setIsAuthenticated(false);
    setUser(null);
    setSelectedPatient(null);
    resetWorkflow();
    setCurrentScreen("screen2");
  };

  if (!isAuthenticated) {
    return (
      <Screen1Login
        onLogin={() => {
          setUser(getStoredUser());
          setIsAuthenticated(true);
          setCurrentScreen("screen2");
        }}
      />
    );
  }

  const renderScreen = () => {
    switch (currentScreen) {
      case "screen2":
        return (
          <Screen2Dashboard
            isOffline={online.isOffline}
            user={user}
            onStartDictation={() => {
              resetWorkflow();
              setCurrentScreen("screen3");
            }}
            onNavigate={navigateTo}
          />
        );
      case "screen3":
        return (
          <Screen3Dictation
            patient={selectedPatient}
            initialConsultationId={workflow.consultationId}
            isOffline={online.isOffline}
            onAnalyze={(payload) => {
              if (payload.patient) setSelectedPatient(payload.patient);
              setWorkflow({
                consultationId: payload.consultationId,
                transcription: payload.transcription || "",
                extracted: payload.extracted || null,
                coding: payload.coding || null,
                status: payload.status || "coded",
                transmissionId: null,
                transmissionTimestamp: null,
                transmissionOutcome: null,
                transmissionError: "",
              });
              setCurrentScreen("screen4");
            }}
          />
        );
      case "screen4":
        return (
          <Screen4Validation
            patient={selectedPatient}
            consultationId={workflow.consultationId}
            transcription={workflow.transcription}
            extracted={workflow.extracted}
            coding={workflow.coding}
            status={workflow.status}
            isOffline={online.isOffline}
            onConsultationUpdate={(updated) => {
              setWorkflow((prev) => ({
                ...prev,
                status: updated?.status || prev.status,
                extracted: updated?.structured_data || prev.extracted,
                coding: updated?.coding_results || prev.coding,
                transcription: updated?.transcription || prev.transcription,
              }));
            }}
            onTransmit={(result) => {
              const ok = result.outcome === "success" && Boolean(result.transmissionId);
              setWorkflow((prev) => ({
                ...prev,
                status: ok ? "transmitted" : "failed",
                transmissionId: ok ? result.transmissionId : null,
                transmissionTimestamp: ok ? result.timestamp : null,
                transmissionOutcome: ok ? "success" : "failed",
                transmissionError: ok ? "" : result.error || "Échec de la transmission SIH",
                transcription: result.transcription || prev.transcription,
                extracted: result.extracted || prev.extracted,
                coding: result.coding || prev.coding,
              }));
              setCurrentScreen("screen5");
            }}
          />
        );
      case "screen5":
        return (
          <Screen5Transmission
            patient={selectedPatient}
            consultationId={workflow.consultationId}
            transmissionId={workflow.transmissionId}
            timestamp={workflow.transmissionTimestamp}
            transcription={workflow.transcription}
            extracted={workflow.extracted}
            coding={workflow.coding}
            transmissionOutcome={workflow.transmissionOutcome || "failed"}
            transmissionError={workflow.transmissionError}
            isOffline={online.isOffline}
            onTransmissionUpdate={(update) => {
              setWorkflow((prev) => ({
                ...prev,
                status: update.status || prev.status,
                transmissionId: update.transmissionId ?? prev.transmissionId,
                transmissionTimestamp: update.timestamp ?? prev.transmissionTimestamp,
                transmissionOutcome: update.status === "transmitted" ? "success" : "failed",
                transmissionError: update.error || "",
              }));
            }}
            onNewConsultation={() => {
              resetWorkflow();
              setCurrentScreen("screen3");
            }}
            onReturnHome={() => {
              resetWorkflow();
              setCurrentScreen("screen2");
            }}
          />
        );
      case "patients":
        return (
          <ScreenPatientDetail
            key={`patients-${patientsVisitKey}-${selectedPatient?.id || "none"}`}
            isOffline={online.isOffline}
            initialPatientId={selectedPatient?.id || null}
            onNewConsultation={(patient, consultation) => {
              if (patient) setSelectedPatient(patient);
              setWorkflow({
                ...emptyWorkflow(),
                consultationId: consultation?.id || null,
                status: consultation?.status || "draft",
              });
              setCurrentScreen("screen3");
            }}
          />
        );
      case "history":
        return <ScreenHistory isOffline={online.isOffline} />;
      case "settings":
        return (
          <ScreenSettings
            isOffline={online.isOffline}
            user={user}
            onLogout={handleLogout}
          />
        );
      case "offline":
        return (
          <ScreenOffline
            isOffline={online.isOffline}
            browserOnline={online.browserOnline}
            serverReachable={online.serverReachable}
            databaseConnected={online.databaseConnected}
            checking={online.checking}
            lastCheckedAt={online.lastCheckedAt}
            onRetryConnectivity={online.refresh}
            onNavigate={navigateTo}
          />
        );
      default:
        return (
          <Screen2Dashboard
            isOffline={online.isOffline}
            user={user}
            onStartDictation={() => setCurrentScreen("screen3")}
            onNavigate={navigateTo}
          />
        );
    }
  };

  return (
    <Layout
      currentScreen={currentScreen}
      onNavigate={navigateTo}
      onLogout={handleLogout}
      user={user}
      isOffline={online.isOffline}
      databaseConnected={online.databaseConnected}
    >
      <OfflineBanner
        visible={online.isOffline}
        browserOnline={online.browserOnline}
        serverReachable={online.serverReachable}
      />
      {renderScreen()}
    </Layout>
  );
}
