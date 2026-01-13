
import { GoogleGenAI } from "@google/genai";
import React, { useState, useContext, useEffect, useRef, useMemo } from 'react';
import { AppContext } from '../App';
import { ChatBubbleIcon } from './icons';
import { Role } from '../types';
import { pushData, db } from '../firebase';
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';

interface Message {
  id: string;
  threadId: string;
  senderId: string;
  senderName: string;
  text: string;
  isAdmin: boolean;
  timestamp: Timestamp | any;
  groundingLinks?: { title: string; uri: string }[];
}

interface Thread {
  id: string;
  name: string;
  lastText: string;
  timestamp: Timestamp | any;
}

const ChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { currentUser, systemSettings } = useContext(AppContext);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [indexError, setIndexError] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const guestId = useMemo(() => {
    let id = localStorage.getItem('clestin_guest_id');
    if (!id) {
      id = `guest-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('clestin_guest_id', id);
    }
    return id;
  }, []);

  const isAdmin = currentUser?.role === Role.Admin || currentUser?.role === Role.SuperAdmin;
  const currentUserId = currentUser?.id || guestId;
  const currentUserName = currentUser?.name || 'Guest User';

  useEffect(() => {
    const messagesRef = collection(db, "messages");
    let q;

    try {
      if (isAdmin) {
        q = query(messagesRef, orderBy("timestamp", "asc"));
      } else {
        q = query(messagesRef, where("threadId", "==", currentUserId));
      }

      const unsub = onSnapshot(q, (snapshot) => {
        const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
        const sorted = msgs.sort((a, b) => (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0));
        setMessages(sorted);
        setIndexError(false);
      }, (err) => {
        if (err.code === 'failed-precondition') setIndexError(true);
        console.error("Chat sync error:", err);
      });

      return () => unsub();
    } catch (e) {
      console.error(e);
    }
  }, [currentUserId, isAdmin]);

  const threads = useMemo(() => {
    if (!isAdmin) return [];
    const uniqueThreads = new Map<string, Thread>();
    messages.forEach(msg => {
      if (msg.threadId) {
        uniqueThreads.set(msg.threadId, {
          id: msg.threadId,
          name: msg.senderId === msg.threadId ? msg.senderName : (uniqueThreads.get(msg.threadId)?.name || 'Guest User'),
          lastText: msg.text,
          timestamp: msg.timestamp
        });
      }
    });
    return Array.from(uniqueThreads.values()).sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
  }, [messages, isAdmin]);

  useEffect(() => {
    if (!isAdmin) {
      setActiveThreadId(currentUserId);
    } else if (isAdmin && !activeThreadId && threads.length > 0) {
      setActiveThreadId(threads[0].id);
    }
  }, [isAdmin, currentUserId, threads, activeThreadId]);

  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen, activeThreadId]);

  const triggerAiResponse = async (promptText: string, threadId: string) => {
    setIsAiThinking(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const userLoc = currentUser?.location || { lat: 6.1957, lng: 6.7296 }; // Default to Asaba center

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: promptText,
        config: {
          systemInstruction: `You are the CLESTIN AI Map Assistant for CLESTIN LOGISTICS in Asaba, Nigeria.
          Your goal is to provide directions, find landmarks, and help users understand their delivery routes.
          Be precise with street names (Nnebisi Road, Okpanam Road, DLA, Summit, etc.).
          If asked for directions, use Google Maps grounding to find the most accurate coordinates and locations.
          Always be professional and helpful. Current business name: ${systemSettings.businessName}.`,
          tools: [{ googleMaps: {} }],
          toolConfig: {
            retrievalConfig: {
              latLng: {
                latitude: userLoc.lat,
                longitude: userLoc.lng
              }
            }
          }
        },
      });

      const links = response.candidates?.[0]?.groundingMetadata?.groundingChunks
        ?.filter((chunk: any) => chunk.maps)
        ?.map((chunk: any) => ({
          title: chunk.maps.title,
          uri: chunk.maps.uri
        })) || [];

      await pushData('messages', {
        threadId: threadId,
        senderId: 'ai-dispatcher',
        senderName: 'CLESTIN AI',
        text: response.text || "I've analyzed the map data for you.",
        isAdmin: true,
        timestamp: new Date(),
        groundingLinks: links
      });
    } catch (error) {
      console.error("AI Assistant Error:", error);
    } finally {
      setIsAiThinking(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeThreadId) return;

    const userText = inputText;
    const messagePayload = {
        threadId: activeThreadId,
        senderId: currentUserId,
        senderName: currentUserName,
        text: userText,
        isAdmin: isAdmin,
        timestamp: new Date()
    };

    try {
      await pushData('messages', messagePayload);
      setInputText('');

      // Auto-trigger AI for specific keywords or if addressing the dispatcher
      const lowerText = userText.toLowerCase();
      const triggers = ['where', 'how', 'get to', 'directions', 'location', 'map', 'asaba', 'find', 'ai'];
      if (!isAdmin && (triggers.some(t => lowerText.includes(t)) || lowerText.includes('clestin'))) {
        await triggerAiResponse(userText, activeThreadId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredMessages = messages.filter(m => m.threadId === activeThreadId);

  return (
    <div className="fixed bottom-20 right-4 md:bottom-5 md:right-5 z-[70] flex items-end justify-end w-full pointer-events-none">
      {isOpen && (
        <div className={`pointer-events-auto bg-white dark:bg-slate-900 rounded-2xl md:rounded-3xl shadow-2xl flex flex-col md:flex-row border border-slate-200 dark:border-slate-800 overflow-hidden animate-in slide-in-from-bottom-4 duration-300 ${isAdmin ? 'w-[95vw] md:w-[680px] h-[75vh] md:h-[550px]' : 'w-[95vw] md:w-96 h-[70vh] md:h-[520px]'} mb-2 md:mb-4 mr-1 md:mr-0`}>
          
          {isAdmin && (
            <div className="w-full md:w-56 border-r border-slate-100 dark:border-slate-800 flex flex-col bg-slate-50 dark:bg-slate-950/50 max-h-[20%] md:max-h-full overflow-y-auto border-b md:border-b-0">
              <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-10">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Dispatch Threads</p>
              </div>
              {threads.length === 0 && <p className="p-4 text-[10px] text-slate-400 italic text-center">No active threads</p>}
              {threads.map(t => (
                <button 
                  key={t.id}
                  onClick={() => setActiveThreadId(t.id)}
                  className={`w-full text-left p-3 md:p-4 border-b border-slate-100 dark:border-slate-800 transition-all ${activeThreadId === t.id ? 'bg-white dark:bg-slate-900 shadow-sm border-l-4 border-l-indigo-600' : 'opacity-60 hover:opacity-100'}`}
                >
                  <p className={`text-[10px] font-black uppercase truncate ${activeThreadId === t.id ? 'text-indigo-600' : 'text-slate-600 dark:text-slate-400'}`}>{t.name}</p>
                  <p className="text-[8px] text-slate-400 truncate mt-0.5">{t.lastText}</p>
                </button>
              ))}
            </div>
          )}

          <div className="flex-grow flex flex-col min-w-0 h-full relative">
            <div className="bg-indigo-600 p-3 md:p-4 flex items-center justify-between text-white shrink-0">
              <button onClick={() => setIsOpen(false)} className="p-2 -ml-1 hover:bg-white/10 rounded-xl transition-colors" aria-label="Close Chat">
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"/></svg>
              </button>
              
              <div className="flex flex-col items-center flex-grow px-2 overflow-hidden text-center">
                  <h3 className="font-bold font-outfit uppercase text-[10px] tracking-widest truncate w-full">
                    {isAdmin ? `Agent Hub: ${threads.find(t => t.id === activeThreadId)?.name || 'Session'}` : 'AI Logistics Assistant'}
                  </h3>
                  <p className="text-[8px] opacity-70 uppercase font-black tracking-tighter truncate w-full text-center">Powered by Google AI</p>
              </div>

              <div className="w-10 flex justify-end">
                <div className={`w-2 h-2 rounded-full ${isAiThinking ? 'bg-amber-400 animate-bounce' : 'bg-emerald-400 animate-pulse'}`}></div>
              </div>
            </div>

            <div ref={scrollRef} className="flex-grow p-4 space-y-4 overflow-y-auto custom-scrollbar bg-slate-50/50 dark:bg-slate-950/20">
              {filteredMessages.length === 0 && !isAiThinking && (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3 opacity-40">
                  <div className="p-4 bg-indigo-500/10 rounded-full">
                    <ChatBubbleIcon className="w-8 h-8 text-indigo-500" />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest">Ask me for directions in Asaba</p>
                </div>
              )}
              {filteredMessages.map((msg) => (
                  <div key={msg.id} className={`flex flex-col ${msg.senderId === currentUserId ? 'items-end' : 'items-start'}`}>
                      <div className={`max-w-[90%] p-3.5 rounded-2xl text-xs font-medium shadow-sm leading-relaxed ${
                          msg.senderId === currentUserId 
                              ? 'bg-indigo-600 text-white rounded-tr-none' 
                              : msg.senderId === 'ai-dispatcher'
                                  ? 'bg-emerald-600 text-white rounded-tl-none border-l-4 border-emerald-400'
                                  : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-tl-none'
                      }`}>
                          <p className="whitespace-pre-wrap">{msg.text}</p>
                          {msg.groundingLinks && msg.groundingLinks.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-white/20 space-y-2">
                              <p className="text-[9px] font-black uppercase tracking-widest opacity-80">Pinned Locations:</p>
                              {msg.groundingLinks.map((link, idx) => (
                                <a 
                                  key={idx} 
                                  href={link.uri} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="flex items-center gap-2 bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-all text-[10px] font-bold"
                                >
                                  <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                                  <span className="truncate">{link.title}</span>
                                </a>
                              ))}
                            </div>
                          )}
                      </div>
                      <span className="text-[8px] font-black uppercase text-slate-400 mt-1 px-1 tracking-tighter">
                          {msg.senderName} • {msg.timestamp?.toDate ? new Date(msg.timestamp.toDate()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Just now'}
                      </span>
                  </div>
              ))}
              {isAiThinking && (
                <div className="flex items-center gap-2 px-2">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                  </div>
                  <span className="text-[9px] font-black uppercase text-indigo-500 tracking-widest">Consulting Asaba Fleet Node...</span>
                </div>
              )}
            </div>
            
            <form onSubmit={handleSendMessage} className="p-3 md:p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 mb-safe">
              <div className="flex items-center gap-2">
                  <input 
                      type="text" 
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="Ask AI for directions..."
                      className="flex-grow bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-xs outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-900 dark:text-white font-medium shadow-inner" 
                  />
                  <button type="submit" disabled={!activeThreadId || !inputText.trim() || isAiThinking} className="p-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-500 disabled:opacity-20 transition-all shadow-lg shadow-indigo-500/20 active:scale-95">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
                  </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)} 
          className="pointer-events-auto p-4 md:p-5 rounded-full shadow-2xl transition-all duration-300 transform hover:scale-110 active:scale-90 flex items-center justify-center bg-indigo-600 text-white shadow-indigo-600/30"
          aria-label="Open AI Assistant"
        >
          <div className="relative">
            <ChatBubbleIcon className="w-7 h-7 md:w-8 md:h-8" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-indigo-600 animate-pulse"></div>
          </div>
        </button>
      )}

      <style>{`
        .mb-safe {
          margin-bottom: env(safe-area-inset-bottom, 0);
        }
      `}</style>
    </div>
  );
};

export default ChatWidget;
