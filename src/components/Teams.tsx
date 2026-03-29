import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Users, MapPin, Trophy, Loader2 } from 'lucide-react';
import { getConstructorStandings } from '../services/f1Api';
import { Team } from '../types';

export function Teams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const teamData = await getConstructorStandings();
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
        <h1 className="text-3xl md:text-4xl font-display font-bold tracking-wider uppercase text-white">Constructors</h1>
        <p className="text-gray-400 mt-1">World Championship Teams</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {teams.map((team, index) => (
          <motion.div 
            key={team.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className="bg-f1-dark rounded-3xl border border-f1-gray overflow-hidden relative group"
          >
            <div className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity duration-500">
              <div className="w-full h-full bg-gradient-to-br from-transparent to-white" style={{ backgroundColor: team.color }} />
            </div>
            
            <div className="p-8 relative z-10">
              <div className="flex justify-between items-start mb-8">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 bg-white/5 rounded-2xl p-4 border border-white/10 backdrop-blur-sm">
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
                  <div>
                    <h2 className="text-3xl font-display font-bold text-white uppercase tracking-wider">{team.name}</h2>
                    <div className="flex items-center gap-2 text-gray-400 mt-1">
                      <MapPin className="w-4 h-4" />
                      <span className="text-sm">{team.base}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-4xl font-mono font-bold text-white">{team.points}</p>
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Points</p>
                </div>
              </div>

              <div className="relative h-48 mb-8 flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent rounded-xl" />
                <img 
                  src={team.carImage} 
                  alt={`${team.name} Car`} 
                  referrerPolicy="no-referrer"
                  className="w-[120%] max-w-none h-auto object-contain drop-shadow-2xl group-hover:scale-105 transition-transform duration-700 ease-out"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-f1-gray pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                    <Users className="w-5 h-5 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-bold">Team Principal</p>
                    <p className="font-medium text-white">{team.principal}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-bold">Championship Pos</p>
                    <p className="font-medium text-white">
                      {index + 1}
                      <span className="text-xs text-gray-500 ml-1">
                        {index === 0 ? 'st' : index === 1 ? 'nd' : index === 2 ? 'rd' : 'th'}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
