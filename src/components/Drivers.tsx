import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Trophy, Flag, Medal, Loader2 } from 'lucide-react';
import { getDriverStandings, getConstructorStandings } from '../services/f1Api';
import { Driver, Team } from '../types';
import { GlassCard } from './GlassCard';

export function Drivers() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [driverData, teamData] = await Promise.all([
        getDriverStandings(),
        getConstructorStandings()
      ]);
      setDrivers(driverData);
      setTeams(teamData);
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-f1-red animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 max-w-7xl mx-auto pb-24 md:pb-8">
      <header>
        <h1 className="text-3xl md:text-4xl font-display font-bold tracking-wider uppercase text-white">Drivers</h1>
        <p className="text-gray-400 mt-1">Championship Contenders</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {drivers.map((driver, index) => {
          const team = teams.find(t => t.id === driver.teamId);
          return (
            <GlassCard 
              key={driver.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="rounded-3xl overflow-hidden group transition-all duration-300"
            >
              <div className="relative h-48 bg-gradient-to-b from-transparent to-black/50 flex items-end justify-center pt-8">
                <div className="absolute top-4 left-4 font-display text-6xl font-black text-white/5 group-hover:text-white/10 transition-colors">
                  {driver.number}
                </div>
                <div className="absolute top-4 right-4 w-12 h-12 opacity-20 group-hover:opacity-40 transition-opacity">
                  <img 
                    src={team?.logo} 
                    alt={team?.name} 
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain" 
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
                <img 
                  src={driver.image} 
                  alt={driver.name} 
                  referrerPolicy="no-referrer"
                  className="h-full object-cover object-bottom drop-shadow-2xl group-hover:scale-105 transition-transform duration-500"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/fallback.png.transform/2col/image.png';
                  }}
                />
              </div>
              
              <div className="p-6 border-t-4" style={{ borderColor: team?.color }}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-2xl font-display font-bold text-white uppercase">{driver.name}</h2>
                    <p className="text-sm text-gray-400">{team?.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-mono font-bold text-white">{driver.points}</p>
                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">PTS</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/10">
                  <div className="text-center">
                    <Trophy className="w-4 h-4 text-yellow-500 mx-auto mb-1 drop-shadow-sm" />
                    <p className="text-lg font-mono font-bold text-white drop-shadow-sm">{driver.wins}</p>
                    <p className="text-[10px] text-gray-500 uppercase font-bold">Wins</p>
                  </div>
                  <div className="text-center border-l border-r border-white/10">
                    <Medal className="w-4 h-4 text-gray-400 mx-auto mb-1 drop-shadow-sm" />
                    <p className="text-lg font-mono font-bold text-white drop-shadow-sm">{driver.podiums}</p>
                    <p className="text-[10px] text-gray-500 uppercase font-bold">Podiums</p>
                  </div>
                  <div className="text-center">
                    <Flag className="w-4 h-4 text-f1-red mx-auto mb-1 drop-shadow-sm" />
                    <p className="text-sm font-medium text-white truncate px-1 drop-shadow-sm" title={driver.country}>{driver.country}</p>
                    <p className="text-[10px] text-gray-500 uppercase font-bold">Nation</p>
                  </div>
                </div>
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}
