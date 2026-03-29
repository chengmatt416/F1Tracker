import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Activity, Zap, Timer, AlertTriangle, Loader2, Cloud, Wind, Thermometer, MapPin } from 'lucide-react';
import { cn } from '../lib/utils';
import { getLiveSessionData, getSchedule } from '../services/f1Api';
import { notificationService } from '../services/notificationService';
import { Race } from '../types';

function Countdown({ targetDate }: { targetDate: string }) {
  const [timeLeft, setTimeLeft] = useState<{ days: number, hours: number, minutes: number, seconds: number } | null>(null);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = +new Date(targetDate) - +new Date();
      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      } else {
        setTimeLeft(null);
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  if (!timeLeft) return null;

  return (
    <div className="flex gap-4">
      {[
        { label: 'Days', value: timeLeft.days },
        { label: 'Hours', value: timeLeft.hours },
        { label: 'Min', value: timeLeft.minutes },
        { label: 'Sec', value: timeLeft.seconds },
      ].map((item) => (
        <div key={item.label} className="bg-f1-dark border border-f1-gray rounded-xl p-3 md:p-4 min-w-[70px] md:min-w-[90px] text-center">
          <p className="text-2xl md:text-3xl font-mono font-bold text-white leading-none">{item.value.toString().padStart(2, '0')}</p>
          <p className="text-[10px] md:text-xs text-gray-500 uppercase font-bold mt-1">{item.label}</p>
        </div>
      ))}
    </div>
  );
}

export function LiveRace() {
  const [lap, setLap] = useState(0);
  const [positions, setPositions] = useState<any[]>([]);
  const [currentRace, setCurrentRace] = useState<Race | null>(null);
  const [loading, setLoading] = useState(true);
  const [weather, setWeather] = useState<any>(null);
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const prevLeaderRef = useRef<number | null>(null);

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
        if (liveData) {
          setWeather(liveData.weather);
          setSessionInfo(liveData.session);

          if (Array.isArray(liveData.positions) && liveData.positions.length > 0) {
            // Check for leader change
            const currentLeader = liveData.positions.find((p: any) => p.position === 1);
            if (currentLeader && prevLeaderRef.current !== null && prevLeaderRef.current !== currentLeader.driver_number) {
              const driverInfo = liveData.drivers.find((d: any) => d.driver_number === currentLeader.driver_number);
              notificationService.sendNotification('🏁 領先位置更換！', {
                body: `${driverInfo?.full_name || `Driver ${currentLeader.driver_number}`} 現在位居第一！`,
                data: { url: '/?tab=live' }
              });
            }
            prevLeaderRef.current = currentLeader?.driver_number || null;

            // Map OpenF1 data
            const latestPositions = new Map();
            liveData.positions.forEach((p: any) => {
              latestPositions.set(p.driver_number, p);
            });

            const latestIntervals = new Map();
            if (Array.isArray(liveData.intervals)) {
              liveData.intervals.forEach((i: any) => {
                latestIntervals.set(i.driver_number, i);
              });
            }

            const latestLaps = new Map();
            const driverBestSectors = new Map();
            const sessionBestSectors = { s1: Infinity, s2: Infinity, s3: Infinity };

            if (Array.isArray(liveData.laps)) {
              liveData.laps.forEach((l: any) => {
                // Update latest lap
                const existing = latestLaps.get(l.driver_number);
                if (!existing || l.lap_number > existing.lap_number) {
                  latestLaps.set(l.driver_number, l);
                }

                // Update driver bests and session bests
                const dBest = driverBestSectors.get(l.driver_number) || { s1: Infinity, s2: Infinity, s3: Infinity };
                
                if (l.duration_sector_1) {
                  if (l.duration_sector_1 < dBest.s1) dBest.s1 = l.duration_sector_1;
                  if (l.duration_sector_1 < sessionBestSectors.s1) sessionBestSectors.s1 = l.duration_sector_1;
                }
                if (l.duration_sector_2) {
                  if (l.duration_sector_2 < dBest.s2) dBest.s2 = l.duration_sector_2;
                  if (l.duration_sector_2 < sessionBestSectors.s2) sessionBestSectors.s2 = l.duration_sector_2;
                }
                if (l.duration_sector_3) {
                  if (l.duration_sector_3 < dBest.s3) dBest.s3 = l.duration_sector_3;
                  if (l.duration_sector_3 < sessionBestSectors.s3) sessionBestSectors.s3 = l.duration_sector_3;
                }
                driverBestSectors.set(l.driver_number, dBest);
              });
            }

            const latestStints = new Map();
            if (Array.isArray(liveData.stints)) {
              liveData.stints.forEach((s: any) => {
                const existing = latestStints.get(s.driver_number);
                if (!existing || s.stint_number > existing.stint_number) {
                  latestStints.set(s.driver_number, s);
                }
              });
            }

            const latestCarData = new Map();
            if (Array.isArray(liveData.carData)) {
              liveData.carData.forEach((c: any) => {
                latestCarData.set(c.driver_number, c);
              });
            }

            const mappedPositions = Array.from(latestPositions.values())
              .sort((a, b) => a.position - b.position)
              .map((p: any) => {
                const driverInfo = Array.isArray(liveData.drivers) ? liveData.drivers.find((d: any) => d.driver_number === p.driver_number) : null;
                const intervalInfo = latestIntervals.get(p.driver_number);
                const lapInfo = latestLaps.get(p.driver_number);
                const stintInfo = latestStints.get(p.driver_number);
                const carInfo = latestCarData.get(p.driver_number);
                
                const dBest = driverBestSectors.get(p.driver_number);
                
                if (lapInfo?.lap_number > lap) {
                  setLap(lapInfo.lap_number);
                }

                const getSectorColor = (time: number, dBestTime: number, sBestTime: number) => {
                  if (!time || time === Infinity) return 'text-gray-600';
                  if (time <= sBestTime) return 'text-f1-purple'; // Purple: Session Best
                  if (time <= dBestTime) return 'text-green-400'; // Green: Personal Best
                  return 'text-yellow-400'; // Yellow: Slower
                };

                return {
                  id: p.driver_number.toString(),
                  name: driverInfo ? driverInfo.full_name : `Driver ${p.driver_number}`,
                  number: p.driver_number,
                  teamId: driverInfo ? driverInfo.team_name : 'Unknown',
                  position: p.position,
                  gap: p.position === 1 ? 'Leader' : (intervalInfo?.gap_to_leader !== undefined && intervalInfo?.gap_to_leader !== null ? `+${Number(intervalInfo.gap_to_leader).toFixed(3)}` : ''),
                  teamColor: driverInfo ? `#${driverInfo.team_colour}` : '#ffffff',
                  lastLap: lapInfo ? lapInfo.lap_duration : null,
                  compound: stintInfo ? stintInfo.compound : null,
                  speed: carInfo ? carInfo.speed : null,
                  gear: carInfo ? carInfo.n_gear : null,
                  rpm: carInfo ? carInfo.rpm : null,
                  drs: carInfo ? carInfo.drs : null,
                  sectors: {
                    s1: { time: lapInfo?.duration_sector_1, color: getSectorColor(lapInfo?.duration_sector_1, dBest?.s1, sessionBestSectors.s1) },
                    s2: { time: lapInfo?.duration_sector_2, color: getSectorColor(lapInfo?.duration_sector_2, dBest?.s2, sessionBestSectors.s2) },
                    s3: { time: lapInfo?.duration_sector_3, color: getSectorColor(lapInfo?.duration_sector_3, dBest?.s3, sessionBestSectors.s3) }
                  }
                };
              });

            if (mappedPositions.length > 0) {
              setPositions(mappedPositions);
            }
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

  const formatLapTime = (secondsInput: number | null | string) => {
    const seconds = Number(secondsInput);
    if (!seconds || isNaN(seconds)) return '--:--.---';
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(3);
    return `${mins}:${secs.padStart(6, '0')}`;
  };

  const getCompoundColor = (compound: string | null) => {
    switch (compound?.toUpperCase()) {
      case 'SOFT': return 'bg-red-600';
      case 'MEDIUM': return 'bg-yellow-500';
      case 'HARD': return 'bg-white';
      case 'INTERMEDIATE': return 'bg-green-600';
      case 'WET': return 'bg-blue-600';
      default: return 'bg-gray-600';
    }
  };

  if (loading || !currentRace) {
    return (
      <div className="flex items-center justify-center h-full min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-f1-red animate-spin" />
      </div>
    );
  }

  const isUpcoming = currentRace.status === 'upcoming';
  const leader = positions[0];

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 max-w-7xl mx-auto h-full flex flex-col">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            {currentRace.status === 'live' ? (
              <div className="bg-f1-red text-white px-3 py-1 rounded-md text-sm font-bold uppercase tracking-wider flex items-center gap-2 animate-pulse">
                <Activity className="w-4 h-4" /> LIVE
              </div>
            ) : (
              <div className="bg-f1-gray text-white px-3 py-1 rounded-md text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                <Timer className="w-4 h-4" /> {currentRace.status.toUpperCase()}
              </div>
            )}
            {currentRace.status === 'live' && (
              <span className="text-gray-400 font-mono text-sm">LAP {lap}/{currentRace.laps}</span>
            )}
            {sessionInfo && (
              <span className="text-f1-red font-mono text-sm font-bold">{sessionInfo.session_name}</span>
            )}
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold tracking-wider uppercase text-white">{currentRace.name}</h1>
          <div className="flex items-center gap-2 text-gray-400 mt-1">
            <MapPin className="w-4 h-4" />
            <span className="text-sm">{currentRace.circuit}, {currentRace.country}</span>
          </div>
        </div>
        
        <div className="flex gap-2 md:gap-4 w-full md:w-auto">
          <div className="flex-1 md:flex-none bg-f1-dark px-4 md:px-6 py-3 rounded-xl border border-f1-gray text-center">
            <p className="text-[10px] md:text-xs text-gray-400 uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
              <Thermometer className="w-3 h-3" /> Track
            </p>
            <p className={cn("text-lg md:text-xl font-mono font-bold", weather ? "text-white" : "text-gray-600")}>
              {weather ? `${weather.track_temperature}°C` : '--°C'}
            </p>
          </div>
          <div className="flex-1 md:flex-none bg-f1-dark px-4 md:px-6 py-3 rounded-xl border border-f1-gray text-center">
            <p className="text-[10px] md:text-xs text-gray-400 uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
              <Cloud className="w-3 h-3" /> Air
            </p>
            <p className={cn("text-lg md:text-xl font-mono font-bold", weather ? "text-white" : "text-gray-600")}>
              {weather ? `${weather.air_temperature}°C` : '--°C'}
            </p>
          </div>
          <div className="hidden md:block bg-f1-dark px-4 md:px-6 py-3 rounded-xl border border-f1-gray text-center">
            <p className="text-[10px] md:text-xs text-gray-400 uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
              <Wind className="w-3 h-3" /> Humidity
            </p>
            <p className={cn("text-lg md:text-xl font-mono font-bold", weather ? "text-white" : "text-gray-600")}>
              {weather ? `${weather.humidity}%` : '--%'}
            </p>
          </div>
        </div>
      </header>

      {isUpcoming && (
        <div className="flex-1 flex flex-col items-center justify-center space-y-8 py-12">
          <div className="text-center space-y-2">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-white uppercase tracking-widest">Next Session Starts In</h2>
            <p className="text-gray-400">Prepare for the adrenaline</p>
          </div>
          <Countdown targetDate={currentRace.date} />
          <div className="w-full max-w-2xl aspect-video relative rounded-3xl overflow-hidden border border-f1-gray group">
            <div className="absolute inset-0 bg-gradient-to-t from-f1-darker via-transparent to-transparent z-10" />
            <img 
              src={currentRace.layoutImage} 
              alt="Track Layout" 
              referrerPolicy="no-referrer"
              className="w-full h-full object-contain p-8 opacity-40 group-hover:scale-105 transition-transform duration-1000" 
            />
            <div className="absolute bottom-8 left-8 z-20">
              <p className="text-f1-red font-bold uppercase tracking-widest text-sm mb-1">Circuit Profile</p>
              <h3 className="text-2xl font-display font-bold text-white uppercase">{currentRace.circuit}</h3>
            </div>
          </div>
        </div>
      )}

      {!isUpcoming && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 flex-1">
          {/* Leaderboard */}
          <div className="xl:col-span-1 bg-f1-dark rounded-2xl border border-f1-gray overflow-hidden flex flex-col h-[400px] xl:h-auto">
            <div className="p-4 border-b border-f1-gray bg-black/20 flex justify-between items-center shrink-0">
              <h3 className="font-display font-bold text-xl uppercase tracking-wider">Live Timing</h3>
              <Timer className="w-5 h-5 text-gray-400" />
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {positions.length > 0 ? positions.map((driver: any, index) => {
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
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-white truncate text-sm md:text-base">{driver.name}</p>
                        {driver.compound && (
                          <div className={cn("w-3 h-3 rounded-full flex items-center justify-center text-[8px] font-bold text-black", getCompoundColor(driver.compound))}>
                            {driver.compound[0]}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 mt-0.5">
                        <span className={cn("text-[9px] font-mono font-bold", driver.sectors.s1.color)}>
                          S1: {driver.sectors.s1.time ? Number(driver.sectors.s1.time).toFixed(1) : '--.-'}
                        </span>
                        <span className={cn("text-[9px] font-mono font-bold", driver.sectors.s2.color)}>
                          S2: {driver.sectors.s2.time ? Number(driver.sectors.s2.time).toFixed(1) : '--.-'}
                        </span>
                        <span className={cn("text-[9px] font-mono font-bold", driver.sectors.s3.color)}>
                          S3: {driver.sectors.s3.time ? Number(driver.sectors.s3.time).toFixed(1) : '--.-'}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-mono text-xs md:text-sm text-white">{driver.gap}</p>
                      <p className="text-[10px] text-gray-500 font-mono">{formatLapTime(driver.lastLap)}</p>
                    </div>
                  </motion.div>
                );
              }) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-2 p-8 text-center">
                  <AlertTriangle className="w-8 h-8 opacity-20" />
                  <p className="text-sm">No live timing data available for this session yet.</p>
                </div>
              )}
            </div>
          </div>

          {/* Telemetry & Track Map */}
          <div className="xl:col-span-2 space-y-6 flex flex-col">
            {/* Track Map */}
            <div className="bg-f1-dark rounded-2xl border border-f1-gray p-4 md:p-6 relative flex-1 min-h-[250px] md:min-h-[300px] flex items-center justify-center overflow-hidden">
              <img 
                src={currentRace.layoutImage} 
                alt="Track Map" 
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain opacity-50" 
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              {/* Leader Telemetry Overlay */}
              {leader && leader.speed && (
                <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md border border-white/10 rounded-xl p-3 flex gap-6">
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-bold">Speed</p>
                    <p className="text-xl font-display font-bold text-white">{leader.speed} <span className="text-xs font-mono text-gray-400">km/h</span></p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-bold">Gear</p>
                    <p className="text-xl font-display font-bold text-f1-red">{leader.gear === 0 ? 'N' : leader.gear}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-bold">RPM</p>
                    <p className="text-xl font-display font-bold text-white">{leader.rpm}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Telemetry Dashboard */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-f1-dark rounded-2xl border border-f1-gray p-4 md:p-5">
                <div className="flex justify-between items-center mb-2 md:mb-4">
                  <p className="text-[10px] md:text-sm font-bold text-gray-400 uppercase tracking-wider">Wind Speed</p>
                  <Wind className="w-4 h-4 text-blue-400" />
                </div>
                <div className="flex items-end gap-1 md:gap-2">
                  <span className={cn("text-3xl md:text-4xl font-display font-bold", weather ? "text-white" : "text-gray-600")}>
                    {weather ? weather.wind_speed : '--'}
                  </span>
                  <span className="text-xs md:text-sm text-gray-600 font-mono mb-1">m/s</span>
                </div>
                <p className="text-[10px] md:text-xs text-gray-600 mt-1 md:mt-2">
                  {weather ? `Direction: ${weather.wind_direction}°` : 'Waiting for data...'}
                </p>
              </div>
              
              <div className="bg-f1-dark rounded-2xl border border-f1-gray p-4 md:p-5">
                <div className="flex justify-between items-center mb-2 md:mb-4">
                  <p className="text-[10px] md:text-sm font-bold text-gray-400 uppercase tracking-wider">Rain Risk</p>
                  <Cloud className="w-4 h-4 text-gray-400" />
                </div>
                <div className="flex items-end gap-1 md:gap-2">
                  <span className={cn("text-3xl md:text-4xl font-display font-bold", weather ? "text-white" : "text-gray-600")}>
                    {weather ? (weather.rainfall === 1 ? 'HIGH' : 'LOW') : '--'}
                  </span>
                </div>
                <p className="text-[10px] md:text-xs text-gray-600 mt-1 md:mt-2">
                  {weather ? (weather.rainfall === 1 ? 'Rain detected' : 'Dry conditions') : 'Waiting for data...'}
                </p>
              </div>

              <div className="col-span-2 md:col-span-1 bg-f1-dark rounded-2xl border border-f1-gray p-4 md:p-5">
                <div className="flex justify-between items-center mb-2 md:mb-4">
                  <p className="text-[10px] md:text-sm font-bold text-gray-400 uppercase tracking-wider">Pressure</p>
                  <Activity className="w-4 h-4 text-f1-red" />
                </div>
                <div className="flex items-end gap-2">
                  <span className={cn("text-2xl md:text-3xl font-mono font-bold", weather ? "text-white" : "text-gray-600")}>
                    {weather ? weather.pressure : '----'}
                  </span>
                  <span className="text-xs md:text-sm text-gray-600 font-mono mb-1">hPa</span>
                </div>
                <p className="text-[10px] md:text-xs text-gray-600 mt-1 md:mt-2">
                  {weather ? 'Atmospheric pressure' : 'Waiting for data...'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
