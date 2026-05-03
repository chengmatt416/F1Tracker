import { motion } from 'motion/react';
import { LayoutDashboard, Users, Car, Calendar, Activity, Zap } from 'lucide-react';
import { cn } from '../lib/utils';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenTestPanel: () => void;
}

export function Sidebar({ activeTab, setActiveTab, onOpenTestPanel }: SidebarProps) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'live', label: 'Live Race', icon: Activity },
    { id: 'drivers', label: 'Drivers', icon: Users },
    { id: 'teams', label: 'Teams', icon: Car },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'ai', label: 'AI Insights', icon: Zap },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-64 h-screen ios-glass flex-col fixed left-0 top-0 z-50">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-f1-red to-orange-600 rounded-lg flex items-center justify-center shadow-lg shadow-f1-red/20 border border-white/20">
            <span className="font-display text-2xl font-bold text-white leading-none mt-1">F1</span>
          </div>
          <span className="font-display text-2xl font-bold tracking-wider mt-1 drop-shadow-md">TRACKER</span>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 relative group active:scale-95",
                  isActive ? "text-white" : "text-gray-400 hover:text-white hover:bg-white/10"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTabDesktop"
                    className="absolute inset-0 bg-white/10 border border-white/20 rounded-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] backdrop-blur-md"
                    initial={false}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <Icon className={cn("w-5 h-5 relative z-10 drop-shadow-sm", isActive && "text-f1-red")} />
                <span className="font-medium relative z-10 drop-shadow-sm">{item.label}</span>
              </button>
            );
          })}
          
          <button
            onClick={onOpenTestPanel}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 text-gray-400 hover:text-white hover:bg-white/10 mt-4 border-t border-white/10 pt-6"
          >
            <Zap className="w-5 h-5 text-f1-purple" />
            <span className="font-medium">Test Panel</span>
          </button>
        </nav>

        <div className="p-6 border-t border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-f1-red to-orange-500 p-[2px] shadow-lg shadow-f1-red/10">
              <div className="w-full h-full rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center overflow-hidden">
                 <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-white drop-shadow-sm">Guest User</p>
              <p className="text-xs text-gray-400">Pro Member</p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-20 ios-glass border-b-0 border-l-0 border-r-0 flex justify-around items-center z-50 px-2 pb-safe">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "flex flex-col items-center justify-center w-16 h-14 rounded-xl relative transition-colors active:scale-95",
                isActive ? "text-white" : "text-gray-400 hover:text-white"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTabMobile"
                  className="absolute inset-0 bg-f1-red/10 border border-f1-red/30 rounded-xl"
                  initial={false}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <Icon className={cn("w-5 h-5 mb-1 relative z-10", isActive && "text-f1-red")} />
              <span className="text-[10px] font-medium relative z-10">{item.label}</span>
            </button>
          );
        })}
        
        <button
          onClick={onOpenTestPanel}
          className="flex flex-col items-center justify-center w-16 h-14 rounded-xl relative transition-colors text-gray-400 hover:text-white"
        >
          <Zap className="w-5 h-5 mb-1 text-f1-purple" />
          <span className="text-[10px] font-medium">Test</span>
        </button>
      </div>
    </>
  );
}
