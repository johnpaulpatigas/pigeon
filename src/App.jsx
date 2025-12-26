// src/App.jsx
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { EdgeToEdge } from "@capawesome/capacitor-android-edge-to-edge-support";
import { useEffect } from "react";
import {
  BrowserRouter,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useAuth } from "./AuthContext";
import LoginScreen from "./components/auth/LoginScreen";
import Dashboard from "./components/Dashboard";
import LoadingScreen from "./components/LoadingScreen";
import UsernameSetup from "./components/UsernameSetup";

function AppRoutes() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      EdgeToEdge.setBackgroundColor({ color: "#ffffff" });
      StatusBar.setBackgroundColor({ color: "#ffffff" });
      StatusBar.setStyle({ style: Style.Light });

      const backButtonListener = CapacitorApp.addListener("backButton", () => {
        if (location.pathname === "/" || location.pathname === "/login") {
          CapacitorApp.exitApp();
        } else {
          navigate(-1);
        }
      });

      return () => {
        backButtonListener.remove();
      };
    }
  }, [navigate, location]);

  if (loading) return <LoadingScreen />;
  if (!user) return <LoginScreen />;
  if (!profile) return <UsernameSetup />;

  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/chat/:id" element={<Dashboard />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
