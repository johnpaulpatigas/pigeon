// src/App.jsx
import { useAuth } from "./AuthContext";
import LoginScreen from "./components/auth/LoginScreen";
import Dashboard from "./components/Dashboard";
import LoadingScreen from "./components/LoadingScreen";
import UsernameSetup from "./components/UsernameSetup";

export default function App() {
  const { user, profile, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <LoginScreen />;
  if (!profile) return <UsernameSetup />;

  return <Dashboard />;
}
