import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Activity, Zap, Timer, AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { getLiveSessionData, getSchedule } from '../services/f1Api';
import { Race } from '../types';

export function LiveRace() {
  const [lap, setLap] = useState(0);
  const [positions, setPositions] = useState<any[]>([]);
  const [currentRace, setCurrentRace] = useState<Race | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRace = async () => {
      const schedule = await getSchedule();
      if (schedule && schedule.length > 0) {
        const live = schedule.find(r => r.status === 'live') || schedule.find(r => r.status === 'upcoming') || schedule[0];
        setCurrentRace(live);
      }
      setLoading(false);
    };
    fetchRace();
  }, []);

  useEffect(() => {
    const fetchLiveData = async () => {
      try {
        const liveData = await getLiveSessionData();
        if (liveData && liveData.positions && liveData.positions.length > 0) {
          // Map OpenF1 data
          // OpenF1 returns multiple position records per driver over time. We need the latest for each.
          const latestPositions = new Map();
          liveData.positions.forEach((p: any) => {
            latestPositions.set(p.driver_number, p);
          });

          const latestIntervals = new Map();
          if (liveData.intervals) {
            liveData.intervals.forEach((i: any) => {
              latestIntervals.set(i.driver_number, i);
            });
          }

          const mappedPositions = Array.from(latestPositions.values())
            .sort((a, b) => a.position - b.position)
            .map((p: any) => {
              const driverInfo = liveData.drivers?.find((d: any) => d.driver_number === p.driver_number);
              const intervalInfo = latestIntervals.get(p.driver_number);
              
              return {
                id: p.driver_number.toString(),
                name: driverInfo ? driverInfo.full_name : `Driver ${p.driver_number}`,
                number: p.driver_number,
                teamId: driverInfo ? driverInfo.team_name : 'Unknown',
                position: p.position,
                gap: p.position === 1 ? 'Leader' : (intervalInfo?.gap_to_leader ? `+${intervalInfo.gap_to_leader.toFixed(3)}` : ''),
                teamColor: driverInfo ? `#${driverInfo.team_colour}` : '#ffffff'
              };
            });

          if (mappedPositions.length > 0) {
            setPositions(mappedPositions);
            return;
          }
        }
      } catch (error) {
        console.error("Live data error", error);
      }
    };

    fetchLiveData();
    const interval = setInterval(fetchLiveData, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !currentRace) {
    return (
      <div className="flex items-center justify-center h-full min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-f1-red animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 max-w-7xl mx-auto h-full flex flex-col">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-f1-red text-white px-3 py-1 rounded-md text-sm font-bold uppercase tracking-wider flex items-center gap-2 animate-pulse">
              <Activity className="w-4 h-4" /> LIVE
            </div>
            <span className="text-gray-400 font-mono text-sm">LAP {lap}/{currentRace.laps}</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold tracking-wider uppercase text-white">{currentRace.name}</h1>
        </div>
        <div className="flex gap-2 md:gap-4 w-full md:w-auto">
          <div className="flex-1 md:flex-none bg-f1-dark px-4 md:px-6 py-3 rounded-xl border border-f1-gray text-center">
            <p className="text-[10px] md:text-xs text-gray-400 uppercase tracking-wider mb-1">Track Temp</p>
            <p className="text-lg md:text-xl font-mono font-bold text-gray-600">--°C</p>
          </div>
          <div className="flex-1 md:flex-none bg-f1-dark px-4 md:px-6 py-3 rounded-xl border border-f1-gray text-center">
            <p className="text-[10px] md:text-xs text-gray-400 uppercase tracking-wider mb-1">Air Temp</p>
            <p className="text-lg md:text-xl font-mono font-bold text-gray-600">--°C</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 flex-1">
        {/* Leaderboard */}
        <div className="xl:col-span-1 bg-f1-dark rounded-2xl border border-f1-gray overflow-hidden flex flex-col h-[400px] xl:h-auto">
          <div className="p-4 border-b border-f1-gray bg-black/20 flex justify-between items-center shrink-0">
            <h3 className="font-display font-bold text-xl uppercase tracking-wider">Live Timing</h3>
            <Timer className="w-5 h-5 text-gray-400" />
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {positions.map((driver: any, index) => {
              const color = driver.teamColor || '#ffffff';
              return (
                <motion.div 
                  layout
                  key={driver.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <div className="w-6 text-center font-mono font-bold text-gray-400">
                    {driver.position}
                  </div>
                  <div className="w-1 h-8 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white truncate text-sm md:text-base">{driver.name}</p>
                    <p className="text-[10px] md:text-xs text-gray-500 uppercase truncate">{driver.teamId}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-mono text-xs md:text-sm text-white">{driver.gap}</p>
                    {index === 0 && <p className="text-[10px] text-f1-red font-bold uppercase">Interval</p>}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Telemetry & Track Map */}
        <div className="xl:col-span-2 space-y-6 flex flex-col">
          {/* Track Map */}
          <div className="bg-f1-dark rounded-2xl border border-f1-gray p-4 md:p-6 relative flex-1 min-h-[250px] md:min-h-[300px] flex items-center justify-center overflow-hidden">
            <img 
              src={currentRace.layoutImage} 
              alt="Track Map" 
              className="w-full h-full object-contain opacity-50" 
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>

          {/* Telemetry Dashboard */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-f1-dark rounded-2xl border border-f1-gray p-4 md:p-5">
              <div className="flex justify-between items-center mb-2 md:mb-4">
                <p className="text-[10px] md:text-sm font-bold text-gray-400 uppercase tracking-wider">Speed Trap</p>
                <Zap className="w-4 h-4 text-yellow-500" />
              </div>
              <div className="flex items-end gap-1 md:gap-2">
                <span className="text-3xl md:text-4xl font-display font-bold text-gray-600">--</span>
                <span className="text-xs md:text-sm text-gray-600 font-mono mb-1">km/h</span>
              </div>
              <p className="text-[10px] md:text-xs text-gray-600 mt-1 md:mt-2">Waiting for data...</p>
            </div>
            
            <div className="bg-f1-dark rounded-2xl border border-f1-gray p-4 md:p-5">
              <div className="flex justify-between items-center mb-2 md:mb-4">
                <p className="text-[10px] md:text-sm font-bold text-gray-400 uppercase tracking-wider">G-Force</p>
                <Activity className="w-4 h-4 text-blue-500" />
              </div>
              <div className="flex items-end gap-1 md:gap-2">
                <span className="text-3xl md:text-4xl font-display font-bold text-gray-600">--</span>
                <span className="text-xs md:text-sm text-gray-600 font-mono mb-1">G</span>
              </div>
              <p className="text-[10px] md:text-xs text-gray-600 mt-1 md:mt-2">Waiting for data...</p>
            </div>

            <div className="col-span-2 md:col-span-1 bg-f1-dark rounded-2xl border border-f1-gray p-4 md:p-5">
              <div className="flex justify-between items-center mb-2 md:mb-4">
                <p className="text-[10px] md:text-sm font-bold text-gray-400 uppercase tracking-wider">Fastest Lap</p>
                <Timer className="w-4 h-4 text-purple-500" />
              </div>
              <div className="flex items-end gap-2">
                <span className="text-2xl md:text-3xl font-mono font-bold text-gray-600">--:--.---</span>
              </div>
              <p className="text-[10px] md:text-xs text-gray-600 mt-1 md:mt-2">Waiting for data...</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
