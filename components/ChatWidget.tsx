
import React, { useState, useContext, useEffect, useRef } from 'react';
import { AppContext } from '../App';
import { ChatBubbleIcon, MapIcon } from './icons';
import { Role } from '../types';
import { pushData, syncChat } from '../firebase';
import { GoogleGenAI } from "@google/genai";

const ChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { currentUser, systemSettings } = useContext(AppContext);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isAdmin = currentUser?.role === Role.Admin || currentUser?.role === Role.SuperAdmin;
  const isSuperAdmin = currentUser?.role === Role.SuperAdmin;

  useEffect(() => {
    const unsub = syncChat((messages) => {
      setChatHistory(messages);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory, isOpen]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userText = inputText;
    const messagePayload = {
        senderId: currentUser?.id || 'guest',
        senderName: currentUser?.name || 'Guest Customer',
        text: userText,
        isAdmin: isAdmin,
        timestamp: new Date()
    };

    try {
      await pushData('messages', messagePayload);
      setInputText('');

      const triggers = ['where', 'location', 'near', 'map', 'asaba', 'find'];
      if (triggers.some(t => userText.toLowerCase().includes(t))) {
        await triggerAiResponse(userText);
      }
    } catch (err) {
      alert("Comms error: Could not transmit message.");
    }
  };

  const triggerAiResponse = async (prompt: string) => {
    setIsAiThinking(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      let locationData = { latitude: 6.1957, longitude: 6.7296 }; // Asaba
      try {
        const pos = await new Promise<GeolocationPosition>((res, rej) => 
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 3000 })
        );
        locationData = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      } catch (e) { 
        console.debug("Location precision unavailable, using center Asaba."); 
      }

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-lite-latest",
        contents: prompt,
        config: {
          systemInstruction: `You are the CLESTIN LOGISTICS AI dispatcher. Help users with logistics and location queries in Asaba, Nigeria. Current business: ${systemSettings.businessName}. Use Google Maps tools to provide accurate coordinates and links.`,
          tools: [{ googleMaps: {} }],
          toolConfig: {
            retrievalConfig: {
              latLng: locationData
            }
          }
        },
      });

      const aiText = response.text || "I'm checking the local fleet maps for you...";
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      
      const mapLinks = groundingChunks
        .filter((chunk: any) => chunk.maps)
        .map((chunk: any) => ({
          title: chunk.maps.title,
          uri: chunk.maps.uri
        }));

      await pushData('messages', {
        senderId: 'ai-dispatcher',
        senderName: 'CLESTIN AI',
        text: aiText,
        isAdmin: true,
        mapLinks: mapLinks,
        timestamp: new Date()
      });
    } catch (error) {
      console.error("AI Error:", error);
    } finally {
      setIsAiThinking(false);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {isOpen && (
        <div className="bg-white dark:bg-slate-900 w-80 md:w-96 h-[550px] rounded-3xl shadow-2xl flex flex-col border border-slate-200 dark:border-slate-800 mb-4 overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          <div className="bg-indigo-600 p-5 flex justify-between items-center text-white">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg"><MapIcon className="w-4 h-4" /></div>
                <div>
                    <h3 className="font-bold font-outfit uppercase text-xs tracking-widest">Fleet Intelligence</h3>
                    <p className="text-[10px] opacity-70">Google Maps Grounding Active</p>
                </div>
            </div>
          </div>
          
          <div ref={scrollRef} className="flex-grow p-4 space-y-4 overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-slate-950/50">
            {chatHistory.map((msg) => (
                <div key={msg.id} className={`flex flex-col ${msg.senderId === currentUser?.id ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[85%] p-3 rounded-2xl text-xs font-medium shadow-sm ${
                        msg.senderId === currentUser?.id 
                            ? 'bg-indigo-600 text-white rounded-tr-none' 
                            : msg.senderId === 'ai-dispatcher'
                                ? 'bg-indigo-500 text-white rounded-tl-none border border-indigo-400'
                                : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-tl-none'
                    }`}>
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                        
                        {msg.mapLinks && msg.mapLinks.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-white/20 space-y-2">
                             <p className="text-[9px] font-black uppercase tracking-widest opacity-80">Map References:</p>
                             {msg.mapLinks.map((link: any, idx: number) => (
                               <a key={idx} href={link.uri} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-all">
                                 <MapIcon className="w-3 h-3" />
                                 <span className="truncate font-bold text-[10px]">{link.title}</span>
                               </a>
                             ))}
                          </div>
                        )}
                    </div>
                    <span className="text-[8px] font-black uppercase text-slate-400 mt-1 px-1 tracking-tighter">
                        {msg.senderName}
                    </span>
                </div>
            ))}
            {isAiThinking && (
              <div className="flex items-center gap-2 text-indigo-500 animate-pulse p-2">
                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                <span className="text-[10px] font-black uppercase tracking-widest">Consulting Maps...</span>
              </div>
            )}
          </div>
          
          <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="flex items-center gap-2">
                <div className="relative flex-grow">
                  <input 
                      type="text" 
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="Ask about locations in Asaba..."
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-xs focus:ring-2 focus:ring-indigo-500 outline-none transition-all pr-12 text-slate-900 dark:text-white font-medium" 
                  />
                  <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-indigo-600 dark:text-indigo-400 disabled:opacity-30">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
                  </button>
                </div>
            </div>
          </form>
        </div>
      )}
      <button onClick={() => setIsOpen(!isOpen)} className={`p-4 rounded-full shadow-2xl transition-all duration-300 transform hover:scale-110 flex items-center justify-center ${isOpen ? 'bg-slate-900 text-white' : 'bg-indigo-600 text-white'}`}>
        {isOpen ? <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg> : <ChatBubbleIcon className="w-8 h-8" />}
      </button>
    </div>
  );
};

export default ChatWidget;
