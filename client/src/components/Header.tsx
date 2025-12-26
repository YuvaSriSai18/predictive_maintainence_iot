// Header with title and connection status
import React, { useEffect, useState } from "react";
import { isSocketConnected } from "../services/socket";

export const Header: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Check connection status on mount
    setIsConnected(isSocketConnected());

    // Poll for connection status changes (Socket.IO will update internally)
    const interval = setInterval(() => {
      setIsConnected(isSocketConnected());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-linear-to-r from-slate-900 via-blue-900 to-indigo-900 shadow-lg border-b border-blue-700">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Logo/Icon */}
            <div className="flex items-center gap-2">
              <div>
                <h1 className="text-lg font-bold text-white tracking-tight">
                  Predictive Maintenance
                </h1>
                <p className="text-xs text-blue-200">
                  IoT Device Monitoring & Analytics
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Simulated Data Badge */}
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/20 px-3 py-1.5 text-xs font-medium text-amber-200 border border-amber-400/30">
              <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400"></span>
              Simulated Data
            </div>

            {/* Connection Status */}
            <div
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                isConnected
                  ? "bg-green-500/20 text-green-200 border border-green-400/30"
                  : "bg-red-500/20 text-red-200 border border-red-400/30"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  isConnected ? "bg-green-400 animate-pulse" : "bg-red-400"
                }`}
              ></span>
              {isConnected ? "Live" : "Disconnected"}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
