import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { AssistantDraft } from '../types.js';
import { PriorityBadge } from '../components/PriorityBadge.js';
import {
  Sparkles,
  Send,
  ArrowRight,
  RefreshCw,
  FileText,
  Building,
  MapPin,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Trash2,
} from 'lucide-react';

interface Props {
  onTransferDraft: (draft: AssistantDraft) => void;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  draft?: AssistantDraft;
  timestamp: string;
}

export const AssistantPage: React.FC<Props> = ({ onTransferDraft }) => {
  const { user, token } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'm-1',
      role: 'assistant',
      content:
        "Hello! I am your **CampusPulse AI Assistant**.\n\nDescribe any issue, maintenance problem, or complaint on campus in plain language. I will help analyze the situation, formulate a clear problem title, identify the correct department & category, evaluate the priority level, and draft a structured service ticket for you to review.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickPrompts = [
    'Water leakage in Science Wing lab 204',
    'Projector not displaying HDMI signal in Lecture Hall 1',
    'WiFi dead zone in Hostel Block B 3rd floor',
    'Elevator button broken on 2nd floor Main Admin',
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, sending]);

  const handleSend = async (userText?: string) => {
    const textToSend = userText || input;
    if (!textToSend.trim() || sending) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!userText) setInput('');
    setSending(true);

    try {
      const activeToken = token || localStorage.getItem('campuspulse_token');
      // Format chat history for backend
      const historyPayload = messages
        .filter((m) => m.id !== 'm-1')
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      const res = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
        },
        body: JSON.stringify({
          message: textToSend.trim(),
          history: historyPayload,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        const assistantMsg: Message = {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: data.reply,
          draft: data.draft,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        const errMsg: Message = {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: `I encountered an issue processing your request: ${data.error || 'Server error'}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, errMsg]);
      }
    } catch (err) {
      const errMsg: Message = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: 'Could not communicate with the assistant service.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setSending(false);
    }
  };

  const handleClear = () => {
    setMessages([
      {
        id: 'm-1',
        role: 'assistant',
        content:
          "Conversation cleared. Describe any issue or maintenance problem on campus to draft a service request.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-140px)] min-h-[550px]">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-t-xl p-4 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>Pulse Assistant</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-200">
                AI Service Copilot
              </span>
            </h1>
            <p className="text-[11px] text-slate-500">
              Campus request formulation, category routing, and structured draft preparation
            </p>
          </div>
        </div>

        <button
          onClick={handleClear}
          className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          title="Clear chat history"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Chat Messages Body */}
      <div className="flex-1 bg-slate-50/70 border-x border-slate-200 overflow-y-auto p-4 space-y-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-slate-400">
              <span className="font-semibold">{m.role === 'user' ? user?.name : 'Pulse Assistant'}</span>
              <span>•</span>
              <span>{m.timestamp}</span>
            </div>

            <div
              className={`max-w-xl rounded-2xl p-4 text-xs leading-relaxed shadow-2xs ${
                m.role === 'user'
                  ? 'bg-blue-600 text-white rounded-tr-none'
                  : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
              }`}
            >
              <div className="whitespace-pre-wrap">{m.content}</div>

              {/* Proposed Draft Preview Card */}
              {m.draft && (
                <div className="mt-4 pt-3 border-t border-slate-200/80 bg-slate-50 p-3.5 rounded-xl text-slate-800 border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-blue-900 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-blue-600" />
                      Suggested Service Request Draft
                    </span>
                    {m.draft.priority && <PriorityBadge priority={m.draft.priority} />}
                  </div>

                  <div className="space-y-1.5 text-[11px]">
                    <div>
                      <strong className="text-slate-900">Title:</strong> {m.draft.title}
                    </div>
                    <div className="text-slate-600">
                      <strong className="text-slate-900">Category:</strong> {m.draft.category} •{' '}
                      <strong className="text-slate-900">Dept:</strong> {m.draft.department}
                    </div>
                    {(m.draft.building || m.draft.roomNumber) && (
                      <div className="text-slate-600">
                        <strong className="text-slate-900">Location:</strong> {m.draft.campusLocation}{' '}
                        {m.draft.building && `(${m.draft.building})`}{' '}
                        {m.draft.roomNumber && `• Room ${m.draft.roomNumber}`}
                      </div>
                    )}
                    <div className="text-slate-600 italic bg-white p-2 rounded border border-slate-100 mt-1">
                      "{m.draft.description}"
                    </div>
                  </div>

                  {/* Transfer to Form Button */}
                  <div className="mt-3 pt-2 border-t border-slate-200/70 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-slate-500 italic">
                      Review & edit in the formal submission screen
                    </span>
                    <button
                      onClick={() => onTransferDraft(m.draft!)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>Transfer Draft to Form</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex flex-col items-start">
            <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none p-3.5 shadow-2xs text-xs text-slate-500 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
              <span>Analyzing issue details and formulating recommendations...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompts */}
      <div className="bg-white border-x border-slate-200 px-4 py-2 flex items-center gap-2 overflow-x-auto">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
          Suggestions:
        </span>
        {quickPrompts.map((qp, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(qp)}
            disabled={sending}
            className="px-2.5 py-1 rounded-full text-[11px] bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-600 border border-slate-200 whitespace-nowrap transition-colors"
          >
            {qp}
          </button>
        ))}
      </div>

      {/* Input row */}
      <div className="bg-white border border-slate-200 rounded-b-xl p-3 shadow-2xs">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your campus issue or question (e.g., 'Broken lab AC causing heating in Room 102')..."
            className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-40 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <span>Send</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
        <p className="text-[10px] text-slate-400 text-center mt-2">
          Pulse Assistant assists with drafting. Requests are never submitted automatically without your explicit confirmation.
        </p>
      </div>
    </div>
  );
};
