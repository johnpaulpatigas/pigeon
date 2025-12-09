// src/components/LoadingScreen.jsx
import { Loader2 } from "lucide-react";

export default function LoadingScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
      <Loader2 size={40} className="mb-4 animate-spin text-blue-500" />
      <p className="animate-pulse font-medium text-gray-400">
        Waking up the pigeons...
      </p>
    </div>
  );
}
