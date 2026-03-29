import { motion } from 'motion/react';
import { LayoutDashboard, Users, Car, Calendar, Activity, Zap } from 'lucide-react';
import { cn } from '../lib/utils';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
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
      <div className="hidden md:flex w-64 h-screen bg-f1-dark border-r border-f1-gray flex-col fixed left-0 top-0 z-50">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-f1-red rounded-sm flex items-center justify-center">
            <span className="font-display text-2xl font-bold text-white leading-none mt-1">F1</span>
          </div>
          <span className="font-display text-2xl font-bold tracking-wider mt-1">TRACKER</span>
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
                  "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 relative group",
                  isActive ? "text-white" : "text-gray-400 hover:text-white hover:bg-white/5"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTabDesktop"
                    className="absolute inset-0 bg-f1-red/10 border border-f1-red/30 rounded-lg"
                    initial={false}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <Icon className={cn("w-5 h-5 relative z-10", isActive && "text-f1-red")} />
                <span className="font-medium relative z-10">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-6 border-t border-f1-gray">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-f1-red to-orange-500 p-[2px]">
              <div className="w-full h-full rounded-full bg-f1-dark flex items-center justify-center overflow-hidden">
                 <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-white">Guest User</p>
              <p className="text-xs text-gray-400">Pro Member</p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-f1-dark/95 backdrop-blur-md border-t border-f1-gray flex justify-around items-center z-50 px-2 pb-safe">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "flex flex-col items-center justify-center w-16 h-14 rounded-xl relative transition-colors",
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
      </div>
    </>
  );
}
