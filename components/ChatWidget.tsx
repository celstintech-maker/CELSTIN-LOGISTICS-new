
import React, { useState, useContext, useEffect, useRef, useMemo } from 'react';
import { AppContext } from '../App';
import { ChatBubbleIcon, MapIcon, UserCircleIcon } from './icons';
import { Role } from '../types';
import { pushData, syncChat, db } from '../firebase';
import { GoogleGenAI } from "@google/genai";
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';

const ChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { currentUser, systemSettings } = useContext(AppContext);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isAdmin = currentUser?.role === Role.Admin || currentUser?.role === Role.SuperAdmin;

  // Sync messages based on role
  useEffect(() => {
    if (!currentUser) return;

    let q;
    const messagesRef = collection(db, "messages");

    if (isAdmin) {
      // Admins see everything to manage threads
      q = query(messagesRef, orderBy("timestamp", "asc"));
    } else {
      // Regular users only see messages belonging to their unique thread
      q = query(messagesRef, where("threadId", "==", currentUser.id), orderBy("timestamp", "asc"));
    }

    const unsub = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
    });

    return () => unsub();
  }, [currentUser, isAdmin]);

  // Derive unique threads for Admin View
  const threads = useMemo(() => {
    if (!isAdmin) return [];
    const uniqueThreads = new Map();
    messages.forEach(msg => {
      if (msg.threadId && msg.senderId !== 'ai-dispatcher') {
        uniqueThreads.set(msg.threadId, {
          id: msg.threadId,
          name: msg.senderName,
          lastText: msg.text,
          timestamp: msg.timestamp
        });
      }
    });
    return Array.from(uniqueThreads.values()).sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
  }, [messages, isAdmin]);

  // Auto-select thread for non-admins or first thread for admins
  useEffect(() => {
    if (!isAdmin && currentUser) {
      setActiveThreadId(currentUser.id);
    } else if (isAdmin && !activeThreadId && threads.length > 0) {
      setActiveThreadId(threads[0].id);
    }
  }, [isAdmin, currentUser, threads]);

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
        threadId: activeThreadId, // Crucial for privacy
        senderId: currentUser?.id || 'guest',
        senderName: currentUser?.name || 'Guest',
        text: userText,
        isAdmin: isAdmin,
        timestamp: new Date()
    };

    try {
      await pushData('messages', messagePayload);
      setInputText('');

      // Trigger AI only for non-admin queries in their own thread
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
        model: "gemini-2.5-flash-lite-latest",
        contents: prompt,
        config: {
          systemInstruction: `You are the CLESTIN LOGISTICS AI dispatcher. Provide location info for thread ${threadId}.`,
          tools: [{ googleMaps: {} }]
        },
      });

      await pushData('messages', {
        threadId: threadId,
        senderId: 'ai-dispatcher',
        senderName: 'CLESTIN AI',
        text: response.text || "Searching maps...",
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
    <div className="fixed bottom-5 right-5 z-50 flex items-end gap-4">
      {isOpen && (
        <div className={`bg-white dark:bg-slate-900 rounded-3xl shadow-2xl flex border border-slate-200 dark:border-slate-800 mb-4 overflow-hidden animate-in slide-in-from-bottom-4 duration-300 ${isAdmin ? 'w-[600px] h-[550px]' : 'w-80 md:w-96 h-[500px]'}`}>
          
          {/* Admin Sidebar */}
          {isAdmin && (
            <div className="w-48 border-r border-slate-100 dark:border-slate-800 flex flex-col bg-slate-50 dark:bg-slate-950/50">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Conversations</p>
              </div>
              <div className="flex-grow overflow-y-auto no-scrollbar">
                {threads.map(t => (
                  <button 
                    key={t.id}
                    onClick={() => setActiveThreadId(t.id)}
                    className={`w-full text-left p-3 border-b border-slate-100 dark:border-slate-800 transition-all ${activeThreadId === t.id ? 'bg-white dark:bg-slate-900 shadow-sm' : 'opacity-60 hover:opacity-100'}`}
                  >
                    <p className={`text-[10px] font-black uppercase truncate ${activeThreadId === t.id ? 'text-indigo-600' : 'text-slate-600 dark:text-slate-400'}`}>{t.name}</p>
                    <p className="text-[9px] text-slate-400 truncate mt-0.5">{t.lastText}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex-grow flex flex-col min-w-0">
            <div className="bg-indigo-600 p-4 flex justify-between items-center text-white">
              <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg"><ChatBubbleIcon className="w-4 h-4" /></div>
                  <div>
                      <h3 className="font-bold font-outfit uppercase text-[10px] tracking-widest">
                        {isAdmin ? `Chat with ${threads.find(t => t.id === activeThreadId)?.name || 'User'}` : 'Support Tunnel'}
                      </h3>
                      <p className="text-[8px] opacity-70 uppercase font-black tracking-tighter">End-to-End Encrypted Access</p>
                  </div>
              </div>
            </div>
            
            <div ref={scrollRef} className="flex-grow p-4 space-y-4 overflow-y-auto custom-scrollbar bg-slate-50/50 dark:bg-slate-950/20">
              {filteredMessages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center opacity-20 grayscale">
                  <ChatBubbleIcon className="w-12 h-12 mb-2" />
                  <p className="text-[10px] font-black uppercase">No Data Stream</p>
                </div>
              )}
              {filteredMessages.map((msg) => (
                  <div key={msg.id} className={`flex flex-col ${msg.senderId === currentUser?.id ? 'items-end' : 'items-start'}`}>
                      <div className={`max-w-[85%] p-3 rounded-2xl text-xs font-medium shadow-sm ${
                          msg.senderId === currentUser?.id 
                              ? 'bg-indigo-600 text-white rounded-tr-none' 
                              : msg.senderId === 'ai-dispatcher'
                                  ? 'bg-emerald-600 text-white rounded-tl-none'
                                  : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-tl-none'
                      }`}>
                          <p className="whitespace-pre-wrap">{msg.text}</p>
                      </div>
                      <span className="text-[8px] font-black uppercase text-slate-400 mt-1 px-1 tracking-tighter">
                          {msg.senderName} • {msg.timestamp?.toDate ? new Date(msg.timestamp.toDate()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '...'}
                      </span>
                  </div>
              ))}
              {isAiThinking && <div className="text-[8px] font-black uppercase text-indigo-500 animate-pulse">AI is typing...</div>}
            </div>
            
            <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="flex items-center gap-2">
                  <input 
                      type="text" 
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder={isAdmin ? "Type your reply..." : "Message logistics support..."}
                      className="flex-grow bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-xs outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-900 dark:text-white font-medium" 
                  />
                  <button type="submit" disabled={!activeThreadId} className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 disabled:opacity-20 transition-all">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
                  </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <button onClick={() => setIsOpen(!isOpen)} className={`p-4 rounded-full shadow-2xl transition-all duration-300 transform hover:scale-110 flex items-center justify-center ${isOpen ? 'bg-slate-900 text-white' : 'bg-indigo-600 text-white'}`}>
        {isOpen ? <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg> : <ChatBubbleIcon className="w-8 h-8" />}
      </button>
    </div>
  );
};

export default ChatWidget;
