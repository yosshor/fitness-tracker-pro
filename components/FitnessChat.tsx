
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { useLanguage } from '../i18n/LanguageContext';
import { useNotification } from '../contexts/NotificationContext';
import { Card, Button } from './UI';
import { Send, Bot, User, Loader2, Trash2, Sparkles } from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

const SUGGESTED_QUESTIONS = {
  en: [
    'What should I eat before a workout?',
    'How much protein do I need to build muscle?',
    'Best exercises for chest growth?',
    'How to improve my bench press?',
    'Meal plan for muscle gain on a budget',
    'How to reduce body fat while keeping muscle?',
  ],
  he: [
    'מה כדאי לאכול לפני אימון?',
    'כמה חלבון אני צריך לבניית שריר?',
    'התרגילים הטובים ביותר לחזה?',
    'איך לשפר את הלחיצת חזה שלי?',
    'תפריט לעלייה במסה בתקציב נמוך',
    'איך להוריד אחוזי שומן בלי לאבד שריר?',
  ],
};

export const FitnessChat: React.FC = () => {
  const { user } = useAuth();
  const { settings } = useApp();
  const { t, language } = useLanguage();
  const { addNotification } = useNotification();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const systemPrompt = language === 'he'
    ? `אתה מאמן כושר וייעוץ תזונה מקצועי. תפקידך לענות על שאלות על:
- תזונת ספורט, תפריטים ותוספי מזון
- תרגילי כושר, טכניקה נכונה וטיפים
- בניית מסת שריר, ירידה במשקל ושיפור הרכב הגוף
- תוכניות אימון, מנוחה והתאוששות

ענה תמיד בעברית. היה מדויק, מעשי ומעודד. אם נשאלת שאלה רפואית, המלץ לפנות לרופא.
השתמש באימוג'ים באופן מינימלי. תן תשובות מובנות עם נקודות כשמתאים.`
    : `You are a professional fitness coach and nutrition advisor. Your role is to answer questions about:
- Sports nutrition, meal plans, and supplements
- Gym exercises, proper technique, and training tips
- Building muscle mass, weight loss, and body composition
- Workout programming, rest, and recovery

Always be precise, practical, and encouraging. If asked a medical question, recommend consulting a doctor.
Use emojis minimally. Give structured answers with bullet points when appropriate.`;

  const sendMessage = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || isLoading) return;

    if (!settings.geminiApiKey) {
      addNotification('error', t('chatNoApiKey'));
      return;
    }

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: messageText,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: settings.geminiApiKey });

      const conversationHistory = messages.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

      conversationHistory.push({
        role: 'user',
        parts: [{ text: messageText }],
      });

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          { role: 'user', parts: [{ text: systemPrompt }] },
          { role: 'model', parts: [{ text: language === 'he' ? 'מובן, אני מוכן לעזור!' : 'Understood, I\'m ready to help!' }] },
          ...conversationHistory,
        ],
      });

      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now()}-resp`,
        role: 'assistant',
        content: response.text || (language === 'he' ? 'לא הצלחתי ליצור תשובה.' : 'Could not generate a response.'),
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error('Chat error:', err);
      addNotification('error', err.message || t('error'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  const suggestions = SUGGESTED_QUESTIONS[language] || SUGGESTED_QUESTIONS.en;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-6rem)] animate-fade-in-up">
      {/* Header */}
      <header className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm text-slate-400 mb-1">{t('navChat')}</p>
          <h1 className="text-3xl font-bold text-white">{t('chatTitle')}</h1>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" onClick={clearChat} className="text-slate-400">
            <Trash2 size={16} />
            {t('chatClear')}
          </Button>
        )}
      </header>

      {/* Messages */}
      <Card className="flex-1 overflow-y-auto mb-4 !p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-16 h-16 rounded-2xl bg-primary-500/10 flex items-center justify-center mb-4">
              <Sparkles size={32} className="text-primary-400" />
            </div>
            <h3 className="text-white font-semibold text-lg mb-2">{t('chatWelcome')}</h3>
            <p className="text-slate-400 text-sm mb-6 max-w-md">{t('chatDescription')}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
              {suggestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(q)}
                  className="text-start text-sm p-3 rounded-xl border border-surface-700 text-slate-400 hover:text-white hover:border-primary-500/40 hover:bg-primary-500/5 transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center shrink-0 mt-1">
                    <Bot size={16} className="text-primary-400" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-primary-500/20 text-white rounded-ee-md'
                      : 'bg-surface-800 text-slate-200 rounded-es-md border border-surface-700/50'
                  }`}
                >
                  {msg.content}
                </div>
                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-lg bg-accent-500/10 flex items-center justify-center shrink-0 mt-1">
                    <User size={16} className="text-accent-400" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center shrink-0">
                  <Bot size={16} className="text-primary-400" />
                </div>
                <div className="bg-surface-800 rounded-2xl rounded-es-md px-4 py-3 border border-surface-700/50">
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Loader2 size={14} className="animate-spin" />
                    {t('chatThinking')}
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </Card>

      {/* Input */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('chatPlaceholder')}
            rows={1}
            className="w-full bg-surface-800 border border-surface-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 resize-none transition-colors"
          />
        </div>
        <Button
          variant="primary"
          onClick={() => sendMessage()}
          disabled={!input.trim() || isLoading}
          className="px-4 self-end"
        >
          {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        </Button>
      </div>
    </div>
  );
};
