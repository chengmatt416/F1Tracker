import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle2, AlertCircle, Loader2, Zap, Bell, Globe, Play, RefreshCw } from 'lucide-react';
import { checkApiHealth, getSchedule, getDriverStandings } from '../services/f1Api';
import { notificationService } from '../services/notificationService';
import { GoogleGenAI } from '@google/genai';
import { cn } from '../lib/utils';

interface TestResult {
  status: 'idle' | 'loading' | 'success' | 'error';
  message: string;
}

export function PWATestModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [apiTest, setApiTest] = useState<TestResult>({ status: 'idle', message: 'Ready to test' });
  const [notificationTest, setNotificationTest] = useState<TestResult>({ status: 'idle', message: 'Ready to test' });
  const [geminiTest, setGeminiTest] = useState<TestResult>({ status: 'idle', message: 'Ready to test' });
  
  // Rate limiting state
  const [testCount, setTestCount] = useState(0);
  const [lastResetTime, setLastResetTime] = useState(Date.now());
  const [rateLimitMessage, setRateLimitMessage] = useState<string | null>(null);

  const checkRateLimit = () => {
    const now = Date.now();
    if (now - lastResetTime > 60000) {
      setTestCount(1);
      setLastResetTime(now);
      setRateLimitMessage(null);
      return true;
    }
    if (testCount >= 10) {
      setRateLimitMessage('已達每分鐘測試上限 (10次)，請稍後再試。');
      return false;
    }
    setTestCount(prev => prev + 1);
    return true;
  };

  const runApiTest = async () => {
    if (!checkRateLimit()) return;
    setApiTest({ status: 'loading', message: 'Checking API health...' });
    try {
      const [healthy, schedule] = await Promise.all([
        checkApiHealth(),
        getSchedule()
      ]);
      if (healthy) {
        const completed = schedule.filter(r => r.status === 'completed');
        const latest = completed[completed.length - 1];
        setApiTest({ 
          status: 'success', 
          message: latest 
            ? `All APIs online. Latest race: Round ${latest.id} (${latest.name})` 
            : 'All F1 APIs are online and responsive!' 
        });
      } else {
        setApiTest({ status: 'error', message: 'Some APIs are unreachable. Check your connection.' });
      }
    } catch (e) {
      setApiTest({ status: 'error', message: 'API check failed. Network error.' });
    }
  };

  const runNotificationTest = async () => {
    if (!checkRateLimit()) return;
    setNotificationTest({ status: 'loading', message: 'Fetching race results & requesting permission...' });
    
    try {
      const [granted, schedule, standings] = await Promise.all([
        notificationService.requestPermission(),
        getSchedule(),
        getDriverStandings()
      ]);

      if (granted) {
        // Find the latest completed race
        const completedRaces = schedule.filter(r => r.status === 'completed');
        const latestRace = completedRaces[completedRaces.length - 1];
        
        let resultBody = '這是一則測試通知，恭喜你已成功開啟通知功能！';
        if (latestRace) {
          const winner = standings.find(d => d.id === latestRace.winnerId);
          resultBody = `最新賽事結果：${latestRace.name}\n冠軍：${winner ? winner.name : latestRace.winnerId || '未知'}\n地點：${latestRace.country}`;
        }

        await notificationService.sendNotification('🧪 PWA 功能與賽事測試', {
          body: resultBody,
          data: { url: '/' }
        });
        setNotificationTest({ 
          status: 'success', 
          message: latestRace 
            ? `最新賽事：${latestRace.name} (${latestRace.country})` 
            : 'Notification sent successfully!' 
        });
      } else {
        setNotificationTest({ status: 'error', message: 'Notification permission denied.' });
      }
    } catch (error) {
      console.error('Notification Test Error:', error);
      setNotificationTest({ status: 'error', message: 'Failed to run notification test.' });
    }
  };

  const runGeminiTest = async () => {
    if (!checkRateLimit()) return;
    setGeminiTest({ status: 'loading', message: 'Connecting to Gemini...' });
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-preview',
        contents: 'Say "Gemini is online and ready for F1 analysis!" in a very short sentence.'
      });
      setGeminiTest({ status: 'success', message: response.text || 'Gemini responded successfully!' });
    } catch (error) {
      console.error('Gemini Test Error:', error);
      setGeminiTest({ status: 'error', message: 'Failed to connect to Gemini. Check API key.' });
    }
  };

  const runAllTests = () => {
    runApiTest();
    runNotificationTest();
    runGeminiTest();
  };

  useEffect(() => {
    if (isOpen) {
      // Run once on open
      runAllTests();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
      >
        <motion.div 
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          className="bg-f1-dark border border-f1-gray rounded-3xl p-8 max-w-2xl w-full shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-f1-red via-f1-purple to-f1-red animate-gradient-x" />
          
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-f1-red/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-f1-red/20">
              <Zap className="w-10 h-10 text-f1-red" />
            </div>
            <h2 className="text-3xl font-display font-bold text-white uppercase tracking-wider mb-2">PWA 啟動成功！</h2>
            <p className="text-gray-400">偵測到您正在使用 PWA 模式，系統正在進行核心功能自動化測試。</p>
          </div>

          <div className="space-y-4 mb-10">
            {/* API Test */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center gap-4 relative group">
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                apiTest.status === 'success' ? "bg-green-500/20 text-green-500" : 
                apiTest.status === 'error' ? "bg-red-500/20 text-red-500" : "bg-blue-500/20 text-blue-500"
              )}>
                <Globe className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h4 className="text-white font-bold">F1 Data APIs</h4>
                <p className="text-sm text-gray-400">{apiTest.message}</p>
              </div>
              <div className="flex items-center gap-3">
                {apiTest.status === 'loading' ? <Loader2 className="w-6 h-6 animate-spin text-blue-500" /> : 
                 apiTest.status === 'success' ? <CheckCircle2 className="w-6 h-6 text-green-500" /> :
                 apiTest.status === 'error' ? <AlertCircle className="w-6 h-6 text-red-500" /> : null}
                
                <button 
                  onClick={runApiTest}
                  disabled={apiTest.status === 'loading'}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
                  title="手動執行測試"
                >
                  <RefreshCw className={cn("w-5 h-5", apiTest.status === 'loading' && "animate-spin")} />
                </button>
              </div>
            </div>

            {/* Notification Test */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center gap-4 relative group">
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                notificationTest.status === 'success' ? "bg-green-500/20 text-green-500" : 
                notificationTest.status === 'error' ? "bg-red-500/20 text-red-500" : "bg-f1-purple/20 text-f1-purple"
              )}>
                <Bell className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h4 className="text-white font-bold">Push Notifications & Results</h4>
                <p className="text-sm text-gray-400">{notificationTest.message}</p>
              </div>
              <div className="flex items-center gap-3">
                {notificationTest.status === 'loading' ? <Loader2 className="w-6 h-6 animate-spin text-f1-purple" /> : 
                 notificationTest.status === 'success' ? <CheckCircle2 className="w-6 h-6 text-green-500" /> :
                 notificationTest.status === 'error' ? <AlertCircle className="w-6 h-6 text-red-500" /> : null}
                
                <button 
                  onClick={runNotificationTest}
                  disabled={notificationTest.status === 'loading'}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
                  title="手動執行測試"
                >
                  <RefreshCw className={cn("w-5 h-5", notificationTest.status === 'loading' && "animate-spin")} />
                </button>
              </div>
            </div>

            {/* Gemini Test */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center gap-4 relative group">
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                geminiTest.status === 'success' ? "bg-green-500/20 text-green-500" : 
                geminiTest.status === 'error' ? "bg-red-500/20 text-red-500" : "bg-f1-red/20 text-f1-red"
              )}>
                <Zap className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h4 className="text-white font-bold">Gemini AI Engine</h4>
                <p className="text-sm text-gray-400">{geminiTest.message}</p>
              </div>
              <div className="flex items-center gap-3">
                {geminiTest.status === 'loading' ? <Loader2 className="w-6 h-6 animate-spin text-f1-red" /> : 
                 geminiTest.status === 'success' ? <CheckCircle2 className="w-6 h-6 text-green-500" /> :
                 geminiTest.status === 'error' ? <AlertCircle className="w-6 h-6 text-red-500" /> : null}
                
                <button 
                  onClick={runGeminiTest}
                  disabled={geminiTest.status === 'loading'}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
                  title="手動執行測試"
                >
                  <RefreshCw className={cn("w-5 h-5", geminiTest.status === 'loading' && "animate-spin")} />
                </button>
              </div>
            </div>

            {rateLimitMessage && (
              <motion.p 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-f1-red text-sm text-center font-bold"
              >
                {rateLimitMessage}
              </motion.p>
            )}
          </div>

          <div className="flex gap-4">
            <button 
              onClick={runAllTests}
              className="flex-1 bg-white text-black font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-gray-200 transition-all active:scale-95"
            >
              <Play className="w-5 h-5" /> 開始全面測試
            </button>
            <button 
              onClick={onClose}
              className="flex-1 bg-f1-gray hover:bg-f1-gray/80 text-white font-bold py-4 rounded-2xl transition-all active:scale-95"
            >
              進入應用程式
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
