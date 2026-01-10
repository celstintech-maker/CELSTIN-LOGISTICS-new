
import React, { useState, useContext, useEffect, useRef } from 'react';
import { AppContext, ChatMessage } from '../App';
import { ChatBubbleIcon } from './icons';
import { Role } from '../types';

const ChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { currentUser, chatHistory, setChatHistory } = useContext(AppContext);
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const isAdmin = currentUser?.role === Role.Admin || currentUser?.role === Role.SuperAdmin;

  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory, isOpen]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        senderId: currentUser?.id || 'guest',
        senderName: currentUser?.name || 'Guest Customer',
        text: inputText,
        timestamp: new Date(),
        isAdmin: isAdmin
    };

    setChatHistory(prev => [...prev, newMessage]);
    setInputText('');
  };

  const clearHistory = () => {
    if (window.confirm("Clear corporate chat history?")) {
        setChatHistory([]);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {isOpen && (
        <div className="bg-white dark:bg-slate-900 w-80 md:w-96 h-[500px] rounded-3xl shadow-2xl flex flex-col border border-slate-200 dark:border-slate-800 mb-4 overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          <div className="bg-indigo-600 p-5 flex justify-between items-center text-white">
            <div>
                <h3 className="font-bold font-outfit uppercase text-xs tracking-widest">Global Comms Hub</h3>
                <p className="text-[10px] opacity-70">Secured Node Protocol</p>
            </div>
            {isAdmin && chatHistory.length > 0 && (
                <button onClick={clearHistory} className="text-[10px] font-black uppercase tracking-tighter hover:text-indigo-200 transition-colors">Wipe History</button>
            )}
          </div>
          
          <div 
            ref={scrollRef}
            className="flex-grow p-4 space-y-4 overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-slate-950/50"
          >
            {chatHistory.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                    <div className="w-12 h-12 bg-indigo-500/10 text-indigo-500 rounded-full flex items-center justify-center mb-3">
                        <ChatBubbleIcon className="w-6 h-6" />
                    </div>
                    <p className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-widest leading-relaxed">
                        {isAdmin ? 'No active support requests found in the queue.' : 'Encrypted link established. Type below to reach a Super Admin.'}
                    </p>
                </div>
            ) : (
                chatHistory.map((msg) => (
                    <div key={msg.id} className={`flex flex-col ${msg.senderId === currentUser?.id ? 'items-end' : 'items-start'}`}>
                        <div className={`max-w-[80%] p-3 rounded-2xl text-xs font-medium shadow-sm ${
                            msg.senderId === currentUser?.id 
                                ? 'bg-indigo-600 text-white rounded-tr-none' 
                                : msg.isAdmin 
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-tl-none'
                                    : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-tl-none'
                        }`}>
                            <p>{msg.text}</p>
                        </div>
                        <span className="text-[8px] font-black uppercase text-slate-400 mt-1 px-1 tracking-tighter">
                            {msg.senderName} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                ))
            )}
          </div>
          
          <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="relative">
                <input 
                    type="text" 
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={isAdmin ? "Type your response..." : "Ask Support anything..."}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-xs focus:ring-2 focus:ring-indigo-500 outline-none transition-all pr-12 text-slate-900 dark:text-white" 
                />
                <button 
                    type="submit"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 rounded-xl transition-all"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
                </button>
            </div>
          </form>
        </div>
      )}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-4 rounded-full shadow-2xl transition-all duration-300 transform hover:scale-110 flex items-center justify-center relative ${
            isOpen ? 'bg-slate-900 text-white rotate-90' : 'bg-indigo-600 text-white'
        }`}
        aria-label="Toggle chat"
      >
        {!isOpen && chatHistory.length > 0 && !isAdmin && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-black flex items-center justify-center rounded-full animate-bounce ring-4 ring-white dark:ring-slate-900">!</span>
        )}
        {isAdmin && chatHistory.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 text-white text-[10px] font-black flex items-center justify-center rounded-full ring-4 ring-white dark:ring-slate-900">{chatHistory.length}</span>
        )}
        {isOpen ? (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
        ) : (
            <ChatBubbleIcon className="w-8 h-8" />
        )}
      </button>
    </div>
  );
};

export default ChatWidget;
