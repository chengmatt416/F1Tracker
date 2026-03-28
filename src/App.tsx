/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { LiveRace } from './components/LiveRace';
import { Drivers } from './components/Drivers';
import { Teams } from './components/Teams';
import { Calendar } from './components/Calendar';
import { AIInsights } from './components/AIInsights';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'live':
        return <LiveRace />;
      case 'drivers':
        return <Drivers />;
      case 'teams':
        return <Teams />;
      case 'calendar':
        return <Calendar />;
      case 'ai':
        return <AIInsights />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex min-h-screen bg-f1-darker text-f1-light font-sans selection:bg-f1-red selection:text-white pb-20 md:pb-0">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="flex-1 md:ml-64 min-h-screen overflow-x-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
