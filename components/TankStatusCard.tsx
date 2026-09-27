export interface TankStatusData {
  id: string;
  name: string;
  fuelType: string;
  capacityLiters: number;
  currentLiters: number;
  color: {
    bar: string;
    bg: string;
    border: string;
    text: string;
    glow: string;
  };
  temperatureC: number;
  waterBottomMm: number;
}

interface TankStatusCardProps {
  tank: TankStatusData;
  percentage: string;
  ullage: number;
  numericPercentage: number;
}

export default function TankStatusCard({
  tank,
  percentage,
  ullage,
  numericPercentage,
}: TankStatusCardProps) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur-md shadow-xl hover:border-zinc-700/80 transition-all">
      <div className="flex items-center justify-between mb-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white tracking-tight">{tank.name}</span>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${tank.color.bg} ${tank.color.border} ${tank.color.text}`}>
              {tank.fuelType}
            </span>
          </div>
          <div className="text-xs text-zinc-400">
            Max Safe Capacity: {tank.capacityLiters.toLocaleString()} L
          </div>
        </div>

        <div className="text-right">
          <div className="text-lg font-bold font-mono text-white">{percentage}%</div>
          <div className="text-[11px] text-zinc-400 font-mono">
            {tank.currentLiters.toLocaleString()} L
          </div>
        </div>
      </div>

      <div className="relative w-full h-4 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800 p-0.5">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${tank.color.bar} transition-all duration-700 shadow-sm ${tank.color.glow}`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="mt-3.5 grid grid-cols-3 gap-2 pt-3 border-t border-zinc-800/80 text-[11px]">
        <div>
          <span className="text-zinc-500">Ullage (Can Take):</span>
          <div className="font-mono font-medium text-cyan-400">+{ullage.toLocaleString()} L</div>
        </div>
        <div>
          <span className="text-zinc-500">Temp / Density:</span>
          <div className="font-mono text-zinc-300">{tank.temperatureC}°C</div>
        </div>
        <div>
          <span className="text-zinc-500">Water Bottom:</span>
          <div className="font-mono text-zinc-300">{tank.waterBottomMm} mm (Clean)</div>
        </div>
      </div>

      {numericPercentage < 25 && (
        <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-[11px] text-rose-300 flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-400 animate-ping" />
          <span>Warning: Fuel level below 25%. Schedule a tanker arrival immediately.</span>
        </div>
      )}
    </div>
  );
}