import { Clock, AlertTriangle } from "lucide-react";

export function MarketPending() {
  return (
    <div className="flex flex-col gap-3">
      <div className="relative overflow-hidden bg-gradient-to-r from-amber-50 via-orange-50 to-yellow-50 border border-amber-200/50 rounded-xl p-4 text-center group">
        {/* Animated background effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-amber-100/30 to-orange-100/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

        {/* Pulsing border effect */}
        <div className="absolute inset-0 border-2 border-amber-400/20 rounded-xl animate-pulse"></div>

        <div className="relative z-10 flex items-center justify-center space-x-2">
          <div className="p-1.5 bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg">
            <Clock className="w-4 h-4 text-white animate-pulse" />
          </div>
          <div className="flex flex-col items-center">
            <div className="text-sm font-bold text-amber-800 mb-1">
              Awaiting Resolution
            </div>
            <div className="text-xs text-amber-700/80 flex items-center space-x-1">
              <AlertTriangle className="w-3 h-3" />
              <span>Market has ended - resolution in progress</span>
            </div>
          </div>
        </div>

        {/* Subtle loading animation */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-400 to-orange-400 opacity-50">
          <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500 w-1/3 animate-pulse"></div>
        </div>
      </div>
    </div>
  );
}
