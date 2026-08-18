import { useCallback, useEffect, useState } from "react";
import { fetchHealth } from "../services/api";

/**
 * Detect browser offline state (navigator.onLine) and probe backend health when online.
 */
export default function useOnlineStatus(pollMs = 30000) {
  const [browserOnline, setBrowserOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine
  );
  const [serverReachable, setServerReachable] = useState(true);
  const [databaseConnected, setDatabaseConnected] = useState(true);
  const [checking, setChecking] = useState(false);
  const [lastCheckedAt, setLastCheckedAt] = useState(null);

  useEffect(() => {
    const onOnline = () => setBrowserOnline(true);
    const onOffline = () => {
      setBrowserOnline(false);
      setServerReachable(false);
      setDatabaseConnected(false);
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const refresh = useCallback(async () => {
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setBrowserOnline(false);
      setServerReachable(false);
      setDatabaseConnected(false);
      setLastCheckedAt(new Date().toISOString());
      return {
        browserOnline: false,
        serverReachable: false,
        databaseConnected: false,
      };
    }

    setBrowserOnline(true);
    setChecking(true);
    try {
      const health = await fetchHealth();
      const dbOk = health?.database === "connected";
      setServerReachable(true);
      setDatabaseConnected(dbOk);
      setLastCheckedAt(new Date().toISOString());
      return {
        browserOnline: true,
        serverReachable: true,
        databaseConnected: dbOk,
        health,
      };
    } catch {
      setServerReachable(false);
      setDatabaseConnected(false);
      setLastCheckedAt(new Date().toISOString());
      return {
        browserOnline: true,
        serverReachable: false,
        databaseConnected: false,
      };
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const probe = async () => {
      if (!browserOnline) {
        setServerReachable(false);
        setDatabaseConnected(false);
        return;
      }
      setChecking(true);
      try {
        const health = await fetchHealth();
        if (cancelled) return;
        setServerReachable(true);
        setDatabaseConnected(health?.database === "connected");
        setLastCheckedAt(new Date().toISOString());
      } catch {
        if (cancelled) return;
        setServerReachable(false);
        setDatabaseConnected(false);
        setLastCheckedAt(new Date().toISOString());
      } finally {
        if (!cancelled) setChecking(false);
      }
    };

    probe();
    const id = window.setInterval(probe, pollMs);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [browserOnline, pollMs]);

  const isOnline = browserOnline && serverReachable;

  return {
    browserOnline,
    serverReachable,
    databaseConnected,
    isOnline,
    isOffline: !isOnline,
    checking,
    lastCheckedAt,
    refresh,
  };
}
