
import React, { useState, useContext, useEffect, useRef } from 'react';
import { AppContext } from '../App';
import { ChatBubbleIcon } from './icons';
import { Role } from '../types';
import { pushData, syncChat, db } from '../firebase';
import { collection, deleteDoc, getDocs } from 'firebase/firestore';

const ChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { currentUser } = useContext(AppContext);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [pendingFile, setPendingFile] = useState<{data: string, name: string, type: string} | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("File too large. Max 2MB allowed.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPendingFile({
          data: reader.result as string,
          name: file.name,
          type: file.type
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && !pendingFile) return;

    const messagePayload = {
        senderId: currentUser?.id || 'guest',
        senderName: currentUser?.name || 'Guest Customer',
        text: inputText,
        isAdmin: isAdmin,
        attachment: pendingFile || null
    };

    try {
      await pushData('messages', messagePayload);
      setInputText('');
      setPendingFile(null);
    } catch (err) {
      alert("Comms error: Could not transmit message.");
    }
  };

  const clearHistory = async () => {
    if (!isSuperAdmin) return;
    if (window.confirm("FINAL WARNING: Clear global support history? This action is restricted to Super Admins.")) {
        const querySnapshot = await getDocs(collection(db, "messages"));
        const deletePromises = querySnapshot.docs.map(d => deleteDoc(d.ref));
        await Promise.all(deletePromises);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {isOpen && (
        <div className="bg-white dark:bg-slate-900 w-80 md:w-96 h-[550px] rounded-3xl shadow-2xl flex flex-col border border-slate-200 dark:border-slate-800 mb-4 overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          <div className="bg-indigo-600 p-5 flex justify-between items-center text-white">
            <div>
                <h3 className="font-bold font-outfit uppercase text-xs tracking-widest">Global Comms Hub</h3>
                <p className="text-[10px] opacity-70">Secured Node Protocol</p>
            </div>
            {isSuperAdmin && chatHistory.length > 0 && (
                <button onClick={clearHistory} className="bg-white/10 px-2 py-1 rounded text-[8px] font-black uppercase tracking-tighter hover:bg-rose-500 transition-colors">Wipe History</button>
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
                        {isAdmin ? 'No active support requests found in the queue.' : 'Encrypted link established. Type below to reach support.'}
                    </p>
                </div>
            ) : (
                chatHistory.map((msg) => (
                    <div key={msg.id} className={`flex flex-col ${msg.senderId === currentUser?.id ? 'items-end' : 'items-start'}`}>
                        <div className={`max-w-[85%] p-3 rounded-2xl text-xs font-medium shadow-sm ${
                            msg.senderId === currentUser?.id 
                                ? 'bg-indigo-600 text-white rounded-tr-none' 
                                : msg.isAdmin 
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-tl-none'
                                    : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-tl-none'
                        }`}>
                            {msg.attachment && (
                              <div className="mb-2">
                                {msg.attachment.type.startsWith('image/') ? (
                                  <img src={msg.attachment.data} className="rounded-lg max-h-48 w-full object-cover cursor-pointer hover:opacity-90" alt="Attachment" onClick={() => window.open(msg.attachment.data)} />
                                ) : (
                                  <a href={msg.attachment.data} download={msg.attachment.name} className="flex items-center gap-2 p-2 bg-black/10 rounded-lg hover:bg-black/20">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/></svg>
                                    <span className="truncate max-w-[120px] text-[10px]">{msg.attachment.name}</span>
                                  </a>
                                )}
                              </div>
                            )}
                            <p>{msg.text}</p>
                        </div>
                        <span className="text-[8px] font-black uppercase text-slate-400 mt-1 px-1 tracking-tighter">
                            {msg.senderName} • {msg.timestamp?.toDate ? msg.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}
                        </span>
                    </div>
                ))
            )}
          </div>
          
          <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 relative">
            {pendingFile && (
              <div className="absolute bottom-full left-4 right-4 mb-2 bg-white dark:bg-slate-800 p-2 rounded-xl shadow-xl border border-indigo-500/30 flex items-center gap-3 animate-in slide-in-from-bottom-2">
                <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-950 overflow-hidden flex-shrink-0">
                  {pendingFile.type.startsWith('image/') ? (
                    <img src={pendingFile.data} className="w-full h-full object-cover" alt="Preview" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/></svg>
                    </div>
                  )}
                </div>
                <div className="flex-grow min-w-0">
                  <p className="text-[10px] font-bold text-slate-800 dark:text-white truncate">{pendingFile.name}</p>
                  <p className="text-[8px] text-slate-500 uppercase">Ready to upload</p>
                </div>
                <button type="button" onClick={() => setPendingFile(null)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-rose-500">
                   <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
            )}
            <div className="flex items-center gap-2">
                <button 
                  type="button" 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2.5 text-slate-400 hover:text-indigo-500 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
                </button>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*,.pdf" />
                <div className="relative flex-grow">
                  <input 
                      type="text" 
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder={isAdmin ? "Type response..." : "Ask Support..."}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-xs focus:ring-2 focus:ring-indigo-500 outline-none transition-all pr-12 text-slate-900 dark:text-white font-medium" 
                  />
                  <button 
                      type="submit"
                      disabled={!inputText.trim() && !pendingFile}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 rounded-xl transition-all disabled:opacity-30"
                  >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
                  </button>
                </div>
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
