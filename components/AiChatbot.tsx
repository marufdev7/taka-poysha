'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  MessageSquare,
  X,
  Send,
  Bot,
  User,
  Trash2,
  TrendingUp,
  HelpCircle,
  Minimize2,
  Maximize2,
  CornerDownLeft,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  time: string;
}

interface AiChatbotProps {
  householdId: string;
  userId: string;
  isFamilyView: boolean;
  isOpen: boolean;
  onToggle: () => void;
}

const PRESET_PROMPTS = [
  { label: '📊 গত মাসের সাথে তুলনা', prompt: 'গত মাসের সাথে এই মাসের আয়-ব্যয় এর তুলনা করো।' },
  { label: '🔍 শীর্ষ ব্যয়ের খাত', prompt: 'এই মাসে কোন কোন খাতে সবচেয়ে বেশি খরচ হয়েছে?' },
  { label: '💡 সঞ্চয় বৃদ্ধির টিপস', prompt: 'আমার সঞ্চয় বাড়ানোর জন্য বাস্তবসম্মত পরামর্শ দাও।' },
  { label: '⚠️ বাজেট ও সীমা চেক', prompt: 'আমার কোনো খাতের বাজেট কি অতিরিক্ত হয়েছে?' },
  { label: '🤝 দেনা-পাওনার হিসাব', prompt: 'আমার বর্তমান দেনা ও পাওনা টাকার অবস্থা কেমন?' },
  { label: '📅 আজকের খরচ', prompt: 'আজকে আমার মোট কত খরচ হয়েছে?' },
];

function formatInline(str: string) {
  return str
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="italic text-slate-600">$1</em>');
}

function FormattedChatText({ text }: { text: string }) {
  const lines = text.split('\n');

  return (
    <div className="space-y-1.5 text-xs sm:text-[13px] leading-relaxed font-['Hind_Siliguri',sans-serif]">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-1" />;

        if (trimmed.startsWith('### ')) {
          return (
            <h5
              key={idx}
              className="font-bold text-slate-900 text-xs sm:text-sm pt-1 pb-0.5 border-b border-purple-100 flex items-center gap-1.5"
            >
              {trimmed.replace(/^###\s+/, '')}
            </h5>
          );
        }

        if (trimmed.startsWith('• ') || trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          const content = trimmed.substring(2);
          return (
            <div key={idx} className="flex items-start gap-1.5 pl-1">
              <span className="text-purple-600 font-bold text-xs mt-0.5">•</span>
              <span className="flex-1" dangerouslySetInnerHTML={{ __html: formatInline(content) }} />
            </div>
          );
        }

        const numMatch = trimmed.match(/^(\d+\.)\s+(.+)$/);
        if (numMatch) {
          return (
            <div key={idx} className="flex items-start gap-1.5 pl-1">
              <span className="text-purple-600 font-bold text-xs mt-0.5">{numMatch[1]}</span>
              <span className="flex-1" dangerouslySetInnerHTML={{ __html: formatInline(numMatch[2]) }} />
            </div>
          );
        }

        return (
          <p key={idx} dangerouslySetInnerHTML={{ __html: formatInline(trimmed) }} />
        );
      })}
    </div>
  );
}

export function AiChatbot({
  householdId,
  userId,
  isFamilyView,
  isOpen,
  onToggle,
}: AiChatbotProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `স্বাগতম! আমি আপনার **টাকা-পয়সা AI আর্থিক সহকারী** 🤖।\n\nআপনি আমাকে যেকোনো প্রশ্ন করতে পারেন, যেমন:\n• *"গত মাসের সাথে এই মাসের আয়-ব্যয় তুলনা করো"*\n• *"কোন খাতে সবচেয়ে বেশি খরচ হয়েছে?"*\n• *"সঞ্চয় বাড়ানোর কিছু পরামর্শ দাও"*\n\nনিচের সাজেস্ট করা বাটনে ক্লিক করেও সহজে জানতে পারেন!`,
      time: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: query,
      time: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const historyPayload = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          history: historyPayload,
          userId,
          householdId,
          isFamilyView,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const aiMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.reply || 'দুঃখিত, কোনো উত্তর পাওয়া যায়নি।',
          time: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, aiMsg]);
      } else {
        const errData = await res.json().catch(() => ({}));
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: `⚠️ দুঃখিত, উত্তর প্রদানে সমস্যা হয়েছে: ${errData.error || 'সার্ভার এরর'}`,
            time: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: '⚠️ নেটওয়ার্ক সমস্যা হয়েছে। ইন্টারনেট সংযোগ চেক করে আবার চেষ্টা করুন।',
          time: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: 'welcome-reset',
        role: 'assistant',
        content: 'চ্যাট হিস্ট্রি রিসেট করা হয়েছে। আপনার নতুন আর্থিক প্রশ্ন জিজ্ঞাসা করতে পারেন!',
        time: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  return (
    <>
      {/* Floating Launcher Button */}
      {!isOpen && (
        <button
          onClick={onToggle}
          className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-40 flex items-center gap-2 sm:gap-2.5 px-3 py-2.5 sm:px-4 sm:py-3 rounded-full bg-gradient-to-r from-purple-600 via-indigo-600 to-emerald-600 text-white shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer group"
          title="টাকা-পয়সা AI আর্থিক সহকারী"
        >
          <div className="relative">
            <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            <span className="absolute -top-1 -right-1 w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-emerald-400 border-2 border-purple-600 animate-ping" />
            <span className="absolute -top-1 -right-1 w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-emerald-400 border-2 border-purple-600" />
          </div>
          <span className="text-xs sm:text-sm font-bold tracking-tight">AI সহকারী</span>
          <Sparkles className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-amber-300" />
        </button>
      )}

      {/* Floating Chat Drawer Window */}
      {isOpen && (
        <>
          {/* Mobile Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs sm:hidden animate-backdrop-fade"
            onClick={onToggle}
          />
          <div className="fixed inset-x-2 bottom-2 sm:inset-x-auto sm:bottom-6 sm:right-6 z-50 w-auto sm:w-[420px] max-w-[420px] h-[82vh] sm:h-[580px] max-h-[85vh] bg-white rounded-3xl shadow-2xl border border-slate-200/80 flex flex-col overflow-hidden animate-modal-pop origin-bottom-right">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 text-white p-3.5 sm:p-4 flex items-center justify-between shadow-xs shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white shadow-xs">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-sm sm:text-base leading-tight">
                    টাকা-পয়সা AI সহকারী
                  </h3>
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                </div>
                <p className="text-[11px] text-purple-200 leading-none mt-0.5">
                  {isFamilyView ? 'পারিবারিক মোড' : 'ব্যক্তিগত মোড'} • রিয়েল-টাইম আর্থিক গাইড
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleClearChat}
                className="p-1.5 rounded-lg text-purple-200 hover:text-white hover:bg-white/10 transition cursor-pointer"
                title="চ্যাট হিস্ট্রি ক্লিয়ার করুন"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={onToggle}
                className="p-1.5 rounded-lg text-purple-200 hover:text-white hover:bg-white/10 transition cursor-pointer"
                title="বন্ধ করুন"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Prompts Carousel Bar */}
          <div className="bg-slate-50 border-b border-slate-100 p-2 overflow-x-auto no-scrollbar flex items-center gap-1.5 shrink-0">
            {PRESET_PROMPTS.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(p.prompt)}
                disabled={loading}
                className="whitespace-nowrap px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-white border border-slate-200/90 text-slate-700 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200 transition shadow-2xs cursor-pointer shrink-0 disabled:opacity-50"
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Messages Body */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-slate-50/50">
            {messages.map((m) => {
              const isUser = m.role === 'user';
              return (
                <div
                  key={m.id}
                  className={`flex items-start gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[11px] ${
                      isUser
                        ? 'bg-emerald-600 text-white'
                        : 'bg-purple-100 text-purple-700'
                    }`}
                  >
                    {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                  </div>

                  <div
                    className={`max-w-[82%] rounded-2xl p-3 shadow-2xs ${
                      isUser
                        ? 'bg-emerald-600 text-white rounded-tr-xs'
                        : 'bg-white text-slate-800 border border-slate-200/70 rounded-tl-xs'
                    }`}
                  >
                    {isUser ? (
                      <p className="text-xs sm:text-[13px] leading-relaxed whitespace-pre-line font-['Hind_Siliguri',sans-serif]">
                        {m.content}
                      </p>
                    ) : (
                      <FormattedChatText text={m.content} />
                    )}

                    <span
                      className={`text-[9px] block text-right mt-1 ${
                        isUser ? 'text-emerald-100' : 'text-slate-400'
                      }`}
                    >
                      {m.time}
                    </span>
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div className="bg-white border border-purple-100 text-purple-700 rounded-2xl rounded-tl-xs p-3 shadow-2xs flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-500 animate-bounce" />
                  <span className="w-2 h-2 rounded-full bg-purple-500 animate-bounce [animation-delay:0.2s]" />
                  <span className="w-2 h-2 rounded-full bg-purple-500 animate-bounce [animation-delay:0.4s]" />
                  <span className="text-xs font-medium text-slate-500 ml-1">
                    হিসাব বিশ্লেষণ হচ্ছে...
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <div className="p-2.5 sm:p-3 bg-white border-t border-slate-100 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                placeholder="আর্থিক প্রশ্ন লিখুন (যেমন: গত মাসের সাথে তুলনা)..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={loading}
                className="flex-1 text-xs sm:text-sm px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-2xl focus:outline-purple-600 focus:bg-white text-slate-800 transition"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="p-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-sm disabled:opacity-40 transition cursor-pointer shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
        </>
      )}
    </>
  );
}
