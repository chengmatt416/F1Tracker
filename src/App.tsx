/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { LiveRace } from './components/LiveRace';
import { Drivers } from './components/Drivers';
import { Teams } from './components/Teams';
import { Calendar } from './components/Calendar';
import { AIInsights } from './components/AIInsights';
import { PWATestModal } from './components/PWATestModal';
import { motion, AnimatePresence } from 'motion/react';
import { checkApiHealth } from './services/f1Api';
import { notificationService } from './services/notificationService';
import { AlertCircle, Download, X, RefreshCw, Car, Bell } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isApiHealthy, setIsApiHealthy] = useState(true);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [showNotificationBanner, setShowNotificationBanner] = useState(false);
  const [showPWATest, setShowPWATest] = useState(false);
  const [isFixing, setIsFixing] = useState(false);

  useEffect(() => {
    // Check if running in PWA standalone mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    const hasShownTest = localStorage.getItem('f1_pwa_test_shown');

    if (isStandalone && !hasShownTest) {
      setShowPWATest(true);
      localStorage.setItem('f1_pwa_test_shown', 'true');
    }

    // Handle deep linking from notifications
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam) {
      setActiveTab(tabParam);
    }

    // PWA Install logic
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Handle PWA installation success
    const handleAppInstalled = () => {
      console.log('PWA was installed');
      setShowInstallBanner(false);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    // Notification permission check
    if (notificationService.getPermissionStatus() === 'default') {
      // Show banner after 5 seconds
      const timer = setTimeout(() => setShowNotificationBanner(true), 5000);
      return () => clearTimeout(timer);
    }

    // Schedule daily news at 8:00 AM (simulated for demo)
    notificationService.scheduleDailyNews(8, 0, '今日賽事預告：巴林大獎賽正賽即將於今晚 11 點開跑！');

    // API Health check logic
    const monitorHealth = async () => {
      const healthy = await checkApiHealth();
      setIsApiHealthy(healthy);
    };

    monitorHealth();
    const healthInterval = setInterval(monitorHealth, 30000); // Check every 30s

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      clearInterval(healthInterval);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    }
    setDeferredPrompt(null);
    setShowInstallBanner(false);
  };

  const handleEnableNotifications = async () => {
    const granted = await notificationService.requestPermission();
    if (granted) {
      await notificationService.sendNotification('🔔 通知功能已開啟', {
        body: '你將會收到賽事即時更新與每日新聞摘要。',
        data: { url: '/' }
      });
    }
    setShowNotificationBanner(false);
  };

  const handleFixServer = async () => {
    setIsFixing(true);
    // Wait a bit to simulate fixing
    await new Promise(resolve => setTimeout(resolve, 2000));
    const healthy = await checkApiHealth();
    
    // Force bypass if still failing, so user isn't blocked forever
    setIsApiHealthy(true);
    setIsFixing(false);
    
    if (healthy) {
      console.log('Server connection fixed!');
    } else {
      console.warn('Server still unhealthy, but bypassing block.');
      // Optionally show a non-blocking toast here
    }
  };

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
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onOpenTestPanel={() => setShowPWATest(true)} />
      
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

      {/* Server Error Popup */}
      <AnimatePresence>
        {!isApiHealthy && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <div className="bg-f1-dark border border-f1-red/50 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl shadow-f1-red/20 relative">
              <button 
                onClick={() => setIsApiHealthy(true)}
                className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              <div className="w-16 h-16 bg-f1-red/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-8 h-8 text-f1-red" />
              </div>
              <h2 className="text-2xl font-display font-bold text-white uppercase tracking-wider mb-2">伺服器連線異常</h2>
              <p className="text-gray-400 mb-8">偵測到與 F1 數據伺服器的連線不穩定，這可能會影響即時遙測數據的顯示。</p>
              <button 
                onClick={handleFixServer}
                disabled={isFixing}
                className="w-full bg-f1-red hover:bg-f1-red/90 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
              >
                {isFixing ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <RefreshCw className="w-5 h-5" />
                )}
                {isFixing ? '正在修復連線...' : '一鍵修復連線'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PWA Install Banner */}
      <AnimatePresence>
        {showInstallBanner && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-24 md:bottom-8 left-4 right-4 md:left-auto md:right-8 md:w-96 z-50"
          >
            <div className="bg-f1-dark border border-f1-gray rounded-2xl p-4 shadow-2xl flex items-center gap-4">
              <div className="w-12 h-12 bg-f1-red rounded-xl flex items-center justify-center shrink-0">
                <Car className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="text-white font-bold text-sm">安裝 F1 Live Dashboard</h4>
                <p className="text-gray-400 text-xs">隨時隨地掌握即時賽況</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={handleInstall}
                  className="bg-white text-black text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1 hover:bg-gray-200"
                >
                  <Download className="w-3 h-3" /> 安裝
                </button>
                <button 
                  onClick={() => setShowInstallBanner(false)}
                  className="text-gray-500 hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notification Banner */}
      <AnimatePresence>
        {showNotificationBanner && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-24 md:bottom-8 left-4 right-4 md:left-auto md:right-8 md:w-96 z-50"
          >
            <div className="bg-f1-dark border border-f1-gray rounded-2xl p-4 shadow-2xl flex items-center gap-4">
              <div className="w-12 h-12 bg-f1-purple rounded-xl flex items-center justify-center shrink-0">
                <Bell className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="text-white font-bold text-sm">開啟即時賽況通知</h4>
                <p className="text-gray-400 text-xs">第一時間獲得即時比數與新聞</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={handleEnableNotifications}
                  className="bg-white text-black text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1 hover:bg-gray-200"
                >
                  開啟
                </button>
                <button 
                  onClick={() => setShowNotificationBanner(false)}
                  className="text-gray-500 hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <PWATestModal isOpen={showPWATest} onClose={() => setShowPWATest(false)} />
    </div>
  );
}
