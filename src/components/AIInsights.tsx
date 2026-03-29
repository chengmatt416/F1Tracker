import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Zap, Send, Bot, User, Loader2 } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { cn } from '../lib/utils';
import Markdown from 'react-markdown';
import { getDriverStandings, getConstructorStandings, getSchedule } from '../services/f1Api';

interface Message {
  role: 'user' | 'model';
  content: string;
}

export function AIInsights() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      content: 'Hello! I am your F1 AI Assistant. Ask me anything about the current season, driver stats, team performance, or race predictions.'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [contextData, setContextData] = useState<any>(null);

  useEffect(() => {
    const fetchContext = async () => {
      try {
        const [drivers, teams, schedule] = await Promise.all([
          getDriverStandings(),
          getConstructorStandings(),
          getSchedule()
        ]);
        setContextData({ drivers, teams, schedule });
      } catch (error) {
        console.error("Failed to fetch context data", error);
      }
    };
    fetchContext();
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      let contextString = "You are an expert F1 analyst and commentator for the current season.";
      
      if (contextData) {
        const topDrivers = contextData.drivers?.slice(0, 3).map((d: any) => `${d.name} (${d.points} pts)`).join(', ') || 'N/A';
        const topTeams = contextData.teams?.slice(0, 3).map((t: any) => `${t.name} (${t.points} pts)`).join(', ') || 'N/A';
        const nextRace = contextData.schedule?.find((r: any) => r.status === 'upcoming')?.name || 'TBD';
        const lastRace = [...(contextData.schedule || [])].reverse().find((r: any) => r.status === 'completed')?.name || 'TBD';
        
        contextString += `
          Current Data Context:
          Top Drivers: ${topDrivers}
          Top Teams: ${topTeams}
          Next Race: ${nextRace}
          Last Race: ${lastRace}
        `;
      }

      contextString += "\nAnswer the user's question concisely, professionally, and with a bit of racing excitement. Use markdown for formatting if needed.";

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-preview',
        contents: `${contextString}\n\nUser: ${userMessage}`
      });

      setMessages(prev => [...prev, { 
        role: 'model', 
        content: response.text || 'I could not process that request.' 
      }]);
    } catch (error) {
      console.error('AI Error:', error);
      setMessages(prev => [...prev, { 
        role: 'model', 
        content: 'Sorry, I encountered an error connecting to the telemetry servers. Please try again.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 max-w-5xl mx-auto h-full flex flex-col pb-24 md:pb-8">
      <header>
        <h1 className="text-3xl md:text-4xl font-display font-bold tracking-wider uppercase text-white flex items-center gap-3">
          <Zap className="w-6 h-6 md:w-8 md:h-8 text-f1-red" />
          AI Race Strategist
        </h1>
        <p className="text-gray-400 mt-1">Powered by Gemini - Real-time insights and predictions</p>
      </header>

      <div className="flex-1 bg-f1-dark rounded-2xl border border-f1-gray flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((msg, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "flex gap-4 max-w-[80%]",
                msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                msg.role === 'user' ? "bg-f1-red" : "bg-blue-600"
              )}>
                {msg.role === 'user' ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-white" />}
              </div>
              <div className={cn(
                "p-4 rounded-2xl",
                msg.role === 'user' 
                  ? "bg-f1-red/20 border border-f1-red/30 text-white rounded-tr-none" 
                  : "bg-white/5 border border-white/10 text-gray-200 rounded-tl-none"
              )}>
                {msg.role === 'user' ? (
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                ) : (
                  <div className="prose prose-invert prose-sm max-w-none">
                    <Markdown>{msg.content}</Markdown>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
          {isLoading && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-4 max-w-[80%]"
            >
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-gray-200 rounded-tl-none flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                <span className="text-sm text-gray-400">Analyzing telemetry...</span>
              </div>
            </motion.div>
          )}
        </div>

        <div className="p-4 border-t border-f1-gray bg-black/20">
          <div className="relative flex items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask about race strategy, driver stats, or predictions..."
              className="w-full bg-f1-darker border border-f1-gray rounded-xl py-4 pl-4 pr-14 text-white placeholder-gray-500 focus:outline-none focus:border-f1-red focus:ring-1 focus:ring-f1-red transition-all"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="absolute right-2 p-2 bg-f1-red text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:hover:bg-f1-red transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <div className="flex gap-2 mt-3 overflow-x-auto pb-2 scrollbar-hide">
            {['Who is leading the championship?', 'Predict the next race winner', 'Compare Ferrari and Red Bull'].map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => setInput(suggestion)}
                className="whitespace-nowrap px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
