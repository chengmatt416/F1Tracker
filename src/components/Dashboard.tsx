import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Trophy, Flag, Timer, ChevronRight, Car, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { getDriverStandings, getConstructorStandings, getSchedule } from '../services/f1Api';
import { Driver, Team, Race } from '../types';

export function Dashboard() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [nextRace, setNextRace] = useState<Race | null>(null);
  const [lastRace, setLastRace] = useState<Race | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [driverData, teamData, scheduleData] = await Promise.all([
          getDriverStandings(),
          getConstructorStandings(),
          getSchedule()
        ]);

        if (driverData && driverData.length > 0) {
          setDrivers(driverData);
        }

        if (teamData && teamData.length > 0) {
          setTeams(teamData);
        }

        if (scheduleData && scheduleData.length > 0) {
          const upcoming = scheduleData.find(r => r.status === 'upcoming' || r.status === 'live');
          const completed = [...scheduleData].reverse().find(r => r.status === 'completed');
          
          if (upcoming) setNextRace(upcoming);
          else setNextRace(scheduleData[scheduleData.length - 1]); // Fallback to last race if season over
          
          if (completed) {
            setLastRace(completed);
          }
        }
      } catch (error) {
        console.error("Failed to fetch real data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const topDrivers = [...drivers].sort((a, b) => b.points - a.points).slice(0, 5);
  const topTeams = [...teams].sort((a, b) => b.points - a.points).slice(0, 5);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-f1-red animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold tracking-wider uppercase text-white">Season Overview</h1>
          <p className="text-gray-400 mt-1">FIA Formula One World Championship</p>
        </div>
        <div className="flex items-center gap-2 bg-f1-dark px-4 py-2 rounded-full border border-f1-gray self-start md:self-auto">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm font-mono text-gray-300">LIVE DATA ACTIVE</span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Next Race Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 bg-f1-dark rounded-2xl border border-f1-gray overflow-hidden relative group"
        >
          <div className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity duration-500">
            <img src={nextRace.layoutImage} alt="Circuit" referrerPolicy="no-referrer" className="w-full h-full object-cover object-center grayscale" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-f1-dark via-f1-dark/80 to-transparent" />
          
          <div className="relative p-8 h-full flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div className="bg-f1-red text-white px-3 py-1 rounded-md text-sm font-bold uppercase tracking-wider">
                Next Race
              </div>
              <div className="text-right">
                <p className="text-gray-400 text-sm font-mono">
                  {new Date(nextRace.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
                <p className="text-white font-medium">{nextRace.country}</p>
              </div>
            </div>

            <div className="mt-12">
              <h2 className="text-5xl font-display font-bold text-white uppercase tracking-wider">{nextRace.name}</h2>
              <div className="flex items-center gap-6 mt-4 text-gray-300">
                <div className="flex items-center gap-2">
                  <Flag className="w-5 h-5 text-f1-red" />
                  <span>{nextRace.circuit}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Timer className="w-5 h-5 text-f1-red" />
                  <span>{nextRace.laps} Laps • {nextRace.length} km</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Last Race Winner */}
        {lastRace && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-f1-dark rounded-2xl border border-f1-gray p-6 flex flex-col justify-between"
          >
            <div>
              <h3 className="text-gray-400 text-sm font-bold uppercase tracking-wider mb-4">Last Race Winner</h3>
              <p className="text-xl font-display font-bold text-white uppercase">{lastRace.name}</p>
            </div>
            
            {lastRace.winnerId && (() => {
              const winner = drivers.find(d => d.id === lastRace.winnerId);
              const team = teams.find(t => t.id === winner?.teamId);
              if (!winner || !team) return null;
              
              return (
                <div className="mt-6 relative">
                  <div className="absolute right-0 bottom-0 w-32 h-32 opacity-10">
                    <img 
                      src={team.logo} 
                      alt={team.name} 
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain" 
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                  <div className="flex items-end gap-4 relative z-10">
                    <div className="w-20 h-20 rounded-full overflow-hidden border-2" style={{ borderColor: team.color }}>
                      <img 
                        src={winner.image} 
                        alt={winner.name} 
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover bg-gray-800" 
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/fallback.png.transform/2col/image.png';
                        }}
                      />
                    </div>
                    <div>
                      <p className="text-3xl font-display font-bold text-white uppercase">{winner.name}</p>
                      <p className="text-sm" style={{ color: team.color }}>{team.name}</p>
                    </div>
                  </div>
                </div>
              );
            })()}
          </motion.div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Driver Standings */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-f1-dark rounded-2xl border border-f1-gray p-6"
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-display font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Driver Standings
            </h3>
            <button className="text-sm text-gray-400 hover:text-white flex items-center gap-1 transition-colors">
              View All <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4">
            {topDrivers.map((driver, index) => {
              const team = teams.find(t => t.id === driver.teamId);
              return (
                <div key={driver.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors group">
                  <div className="w-8 text-center font-display text-2xl font-bold text-gray-500 group-hover:text-white transition-colors">
                    {index + 1}
                  </div>
                  <div className="w-1 h-10 rounded-full" style={{ backgroundColor: team?.color || '#ffffff' }} />
                  <div className="flex-1">
                    <p className="font-bold text-white">{driver.name}</p>
                    <p className="text-xs text-gray-400">{team?.name || driver.teamId}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-bold text-xl text-white">{driver.points}</p>
                    <p className="text-xs text-gray-500 uppercase">PTS</p>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Constructor Standings Chart */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-f1-dark rounded-2xl border border-f1-gray p-6 flex flex-col"
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-display font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Car className="w-5 h-5 text-f1-red" />
              Constructor Standings
            </h3>
          </div>

          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topTeams} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={120} tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: '#15151E', border: '1px solid #38383f', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                />
                <Bar dataKey="points" radius={[0, 4, 4, 0]} barSize={24}>
                  {topTeams.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
