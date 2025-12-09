// src/App.jsx
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { EdgeToEdge } from "@capawesome/capacitor-android-edge-to-edge-support";
import { useEffect } from "react";
import { useAuth } from "./AuthContext";
import LoginScreen from "./components/auth/LoginScreen";
import Dashboard from "./components/Dashboard";
import LoadingScreen from "./components/LoadingScreen";
import UsernameSetup from "./components/UsernameSetup";

export default function App() {
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      EdgeToEdge.setBackgroundColor({ color: "#ffffff" });
      StatusBar.setBackgroundColor({ color: "#ffffff" });
      StatusBar.setStyle({ style: Style.Light });

      const backButtonListener = CapacitorApp.addListener(
        "backButton",
        ({ canGoBack }) => {
          if (canGoBack) {
            window.history.back();
          } else {
            CapacitorApp.exitApp();
          }
        },
      );

      return () => {
        backButtonListener.remove();
      };
    }
  }, []);

  if (loading) return <LoadingScreen />;
  if (!user) return <LoginScreen />;
  if (!profile) return <UsernameSetup />;

  return <Dashboard />;
}
