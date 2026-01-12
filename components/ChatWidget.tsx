
import React, { useState, useContext, useEffect, useRef, useMemo } from 'react';
import { AppContext } from '../App';
import { ChatBubbleIcon } from './icons';
import { Role } from '../types';
import { pushData, db } from '../firebase';
import { GoogleGenAI } from "@google/genai";
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';

interface Message {
  id: string;
  threadId: string;
  senderId: string;
  senderName: string;
  text: string;
  isAdmin: boolean;
  timestamp: Timestamp | any;
}

interface Thread {
  id: string;
  name: string;
  lastText: string;
  timestamp: Timestamp | any;
}

const ChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { currentUser } = useContext(AppContext);
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

      const triggers = ['where', 'location', 'near', 'map', 'asaba', 'find'];
      if (!isAdmin && triggers.some(t => userText.toLowerCase().includes(t))) {
        await triggerAiResponse(userText, activeThreadId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const triggerAiResponse = async (prompt: string, threadId: string) => {
    setIsAiThinking(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          systemInstruction: `You are the Dispatch AI for CLESTIN. thread: ${threadId}. Support the user with delivery queries in Asaba.`,
          tools: [{ googleMaps: {} }]
        },
      });

      await pushData('messages', {
        threadId: threadId,
        senderId: 'ai-dispatcher',
        senderName: 'CLESTIN AI',
        text: response.text || "Analyzing fleet positions...",
        isAdmin: true,
        timestamp: new Date()
      });
    } catch (error) {
      console.error(error);
    } finally {
      setIsAiThinking(false);
    }
  };

  const filteredMessages = messages.filter(m => m.threadId === activeThreadId);

  return (
    <div className="fixed bottom-4 right-4 md:bottom-5 md:right-5 z-50 flex items-end justify-end w-full pointer-events-none">
      {isOpen && (
        <div className={`pointer-events-auto bg-white dark:bg-slate-900 rounded-2xl md:rounded-3xl shadow-2xl flex flex-col md:flex-row border border-slate-200 dark:border-slate-800 overflow-hidden animate-in slide-in-from-bottom-4 duration-300 ${isAdmin ? 'w-[95vw] md:w-[680px] h-[85vh] md:h-[550px]' : 'w-[95vw] md:w-96 h-[80vh] md:h-[520px]'} mb-2 md:mb-4 mr-1 md:mr-0`}>
          
          {isAdmin && (
            <div className="w-full md:w-56 border-r border-slate-100 dark:border-slate-800 flex flex-col bg-slate-50 dark:bg-slate-950/50 max-h-[20%] md:max-h-full overflow-y-auto border-b md:border-b-0">
              <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-10">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Private Threads</p>
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
            {/* Optimized Mobile Header */}
            <div className="bg-indigo-600 p-3 md:p-4 flex items-center justify-between text-white shrink-0">
              <button onClick={() => setIsOpen(false)} className="p-2 -ml-1 hover:bg-white/10 rounded-xl transition-colors" aria-label="Close Chat">
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"/></svg>
              </button>
              
              <div className="flex flex-col items-center flex-grow px-2 overflow-hidden">
                  <h3 className="font-bold font-outfit uppercase text-[10px] tracking-widest text-center truncate w-full">
                    {isAdmin ? `Chat: ${threads.find(t => t.id === activeThreadId)?.name || 'Active Session'}` : 'Private Support Tunnel'}
                  </h3>
                  <p className="text-[8px] opacity-70 uppercase font-black tracking-tighter truncate w-full text-center">Secure Clestin Protocol</p>
              </div>

              {/* Balance for the left back button */}
              <div className="w-10 flex justify-end">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
              </div>
            </div>

            {indexError && (
              <div className="bg-amber-500 text-white text-[9px] font-bold py-1 px-4 text-center shrink-0">
                Syncing with secure server...
              </div>
            )}
            
            <div ref={scrollRef} className="flex-grow p-4 space-y-4 overflow-y-auto custom-scrollbar bg-slate-50/50 dark:bg-slate-950/20">
              {filteredMessages.length === 0 && !isAiThinking && (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3 opacity-40">
                  <ChatBubbleIcon className="w-8 h-8 text-indigo-500" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Beginning Encrypted Session</p>
                </div>
              )}
              {filteredMessages.map((msg) => (
                  <div key={msg.id} className={`flex flex-col ${msg.senderId === currentUserId ? 'items-end' : 'items-start'}`}>
                      <div className={`max-w-[85%] p-3 rounded-2xl text-xs font-medium shadow-sm ${
                          msg.senderId === currentUserId 
                              ? 'bg-indigo-600 text-white rounded-tr-none' 
                              : msg.senderId === 'ai-dispatcher'
                                  ? 'bg-emerald-600 text-white rounded-tl-none'
                                  : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-tl-none'
                      }`}>
                          <p className="whitespace-pre-wrap">{msg.text}</p>
                      </div>
                      <span className="text-[8px] font-black uppercase text-slate-400 mt-1 px-1 tracking-tighter">
                          {msg.senderName} • {msg.timestamp?.toDate ? new Date(msg.timestamp.toDate()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Just now'}
                      </span>
                  </div>
              ))}
              {isAiThinking && (
                <div className="flex items-center gap-2 px-2">
                  <div className="flex gap-1">
                    <span className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce"></span>
                    <span className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                  </div>
                  <span className="text-[8px] font-black uppercase text-indigo-500 tracking-widest">Analyzing Dispatch...</span>
                </div>
              )}
            </div>
            
            <form onSubmit={handleSendMessage} className="p-3 md:p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 mb-safe">
              <div className="flex items-center gap-2">
                  <input 
                      type="text" 
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="Message support..."
                      className="flex-grow bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-xs outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-900 dark:text-white font-medium shadow-inner" 
                  />
                  <button type="submit" disabled={!activeThreadId || !inputText.trim()} className="p-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-500 disabled:opacity-20 transition-all shadow-lg shadow-indigo-500/20 active:scale-95">
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
          aria-label="Open Support Chat"
        >
          <ChatBubbleIcon className="w-7 h-7 md:w-8 md:h-8" />
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
