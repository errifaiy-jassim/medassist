import React, { useState } from "react";
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

export default function App() {
  const [currentScreen, setCurrentScreen] = useState("screen2");
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [transcription, setTranscription] = useState("");
  const [selectedPatient, setSelectedPatient] = useState(null);

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentScreen("screen2");
  };

  if (!isAuthenticated) {
    return <Screen1Login onLogin={() => setIsAuthenticated(true)} />;
  }

  const renderScreen = () => {
    switch (currentScreen) {
      case "screen2":
        return (
          <Screen2Dashboard
            onStartDictation={() => { setTranscription(""); setCurrentScreen("screen3"); }}
            onNavigate={setCurrentScreen}
          />
        );
      case "screen3":
        return (
          <Screen3Dictation
            patient={selectedPatient}
            onAnalyze={(text, patient) => {
              if (text) setTranscription(text);
              if (patient) setSelectedPatient(patient);
              setCurrentScreen("screen4");
            }}
          />
        );
      case "screen4":
        return <Screen4Validation patient={selectedPatient} onTransmit={() => setCurrentScreen("screen5")} />;
      case "screen5":
        return (
          <Screen5Transmission
            patient={selectedPatient}
            onNewConsultation={() => { setCurrentScreen("screen3"); }}
            onReturnHome={() => setCurrentScreen("screen2")}
          />
        );
      case "patients":
        return <ScreenPatientDetail onNewConsultation={(patient) => {
          if (patient) {
            setSelectedPatient(patient);
          }
          setCurrentScreen("screen3");
        }} />;
      case "history":
        return <ScreenHistory />;
      case "settings":
        return <ScreenSettings />;
      case "offline":
        return <ScreenOffline />;
      default:
        return <Screen2Dashboard onStartDictation={() => setCurrentScreen("screen3")} onNavigate={setCurrentScreen} />;
    }
  };

  return (
    <Layout currentScreen={currentScreen} onNavigate={setCurrentScreen} onLogout={handleLogout}>
      {renderScreen()}
    </Layout>
  );
}
