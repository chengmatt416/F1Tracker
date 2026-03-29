import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Calendar as CalendarIcon, MapPin, Flag, CheckCircle2, Clock, Trophy, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { getSchedule } from '../services/f1Api';
import { Race } from '../types';

export function Calendar() {
  const [races, setRaces] = useState<Race[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const scheduleData = await getSchedule();
      setRaces(scheduleData);
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
        <h1 className="text-3xl md:text-4xl font-display font-bold tracking-wider uppercase text-white">Race Calendar</h1>
        <p className="text-gray-400 mt-1">Season Schedule</p>
      </header>

      <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-f1-gray before:to-transparent">
        {races.map((race, index) => {
          const isCompleted = race.status === 'completed';
          const isLive = race.status === 'live';
          const isUpcoming = race.status === 'upcoming';
          
          return (
            <motion.div 
              key={race.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
            >
              {/* Icon */}
              <div className={cn(
                "flex items-center justify-center w-10 h-10 rounded-full border-4 border-f1-darker shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm",
                isCompleted ? "bg-green-500 text-white" : isLive ? "bg-f1-red text-white animate-pulse" : "bg-f1-gray text-gray-400"
              )}>
                {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : isLive ? <Clock className="w-5 h-5" /> : <CalendarIcon className="w-5 h-5" />}
              </div>
              
              {/* Card */}
              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-6 rounded-2xl border border-f1-gray bg-f1-dark hover:border-white/20 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={cn(
                        "text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-md",
                        isCompleted ? "bg-green-500/10 text-green-500" : isLive ? "bg-f1-red/10 text-f1-red" : "bg-f1-gray text-gray-400"
                      )}>
                        {race.status}
                      </span>
                      <span className="text-sm font-mono text-gray-400">{race.date}</span>
                    </div>
                    <h3 className="text-2xl font-display font-bold text-white uppercase tracking-wider">{race.name}</h3>
                    <div className="flex items-center gap-2 text-gray-400 mt-1">
                      <MapPin className="w-4 h-4" />
                      <span className="text-sm">{race.country}</span>
                    </div>
                  </div>
                  
                  <div className="w-24 h-16 opacity-50 group-hover:opacity-100 transition-opacity">
                    <img src={race.layoutImage} alt="Circuit Layout" referrerPolicy="no-referrer" className="w-full h-full object-contain" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-f1-gray/50">
                  <div className="flex items-center gap-2">
                    <Flag className="w-4 h-4 text-gray-500" />
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-bold">Circuit</p>
                      <p className="text-sm font-medium text-white truncate" title={race.circuit}>{race.circuit}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-bold">Distance</p>
                      <p className="text-sm font-medium text-white">{race.laps} Laps • {race.length}km</p>
                    </div>
                  </div>
                </div>

                {isCompleted && race.winnerId && (
                  <div className="mt-4 pt-4 border-t border-f1-gray/50 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center">
                      <Trophy className="w-4 h-4 text-yellow-500" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-bold">Winner</p>
                      <p className="text-sm font-medium text-white uppercase tracking-wider">
                        {race.winnerId.replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
