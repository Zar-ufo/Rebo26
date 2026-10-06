/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, Sparkles, MessageSquare, AlertCircle, RefreshCw, Bot, User, 
  HelpCircle, Trash2, ArrowRightLeft, BookOpen, Quote
} from 'lucide-react';
import { ResearchProject, ChatMessage } from '../types';

interface ChatBoxProps {
  activeProject: ResearchProject;
  onSendMessage: (messages: ChatMessage[]) => void;
  onClearChat: () => void;
}

export default function ChatBox({ activeProject, onSendMessage, onClearChat }: ChatBoxProps) {
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatHistory = activeProject.chatHistory || [];

  // Suggestions list to assist the user
  const suggestions = [
    'Draft a research hypothesis based on the trends',
    'What are the primary statistical biases in my datasets?',
    'Summarize document limitations and gaps',
    'Write an abstract introduction draft for this project'
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory, streamingText]);

  const handleSend = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || loading) return;

    setInputText('');
    setLoading(true);
    setStreamingText('');
    setError(null);

    // Create the temporary user message
    const userMsg: ChatMessage = {
      id: Math.random().toString(),
      role: 'user',
      text: trimmed,
      timestamp: new Date().toISOString()
    };

    // Update frontend state immediately with user message
    const updatedHistory = [...chatHistory, userMsg];
    onSendMessage(updatedHistory);

    try {
      // Send message to our Express streaming endpoint
      const response = await fetch('/api/project/chat-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project: activeProject,
          message: trimmed,
          chatHistory: chatHistory // Sends history up to this point
        })
      });

      if (!response.ok) {
        throw new Error('Connection failed. Verify server state.');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      if (!reader) {
        throw new Error('Failed to open stream reader');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.substring(6).trim();
            if (dataStr === '[DONE]') {
              break;
            }
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.error) {
                throw { isStreamError: true, message: parsed.error };
              }
              if (parsed.text) {
                accumulated += parsed.text;
                setStreamingText(accumulated);
              }
            } catch (e: any) {
              if (e && e.isStreamError) {
                throw new Error(e.message);
              }
              // Soft handle JSON split lines
            }
          }
        }
      }

      // Once done, append complete model response to history
      const modelMsg: ChatMessage = {
        id: Math.random().toString(),
        role: 'model',
        text: accumulated,
        timestamp: new Date().toISOString()
      };

      onSendMessage([...updatedHistory, modelMsg]);
      setStreamingText('');

    } catch (err: any) {
      setError(err.message || 'Chat failed to connect. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSend(inputText);
    }
  };

  return (
    <div className="flex flex-col h-[580px] bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
      
      {/* Chat Title bar */}
      <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <MessageSquare className="w-4.5 h-4.5" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
              AI Chat Companion
            </h4>
            <p className="text-[10px] text-slate-400">
              Active Project Context Index Loaded
            </p>
          </div>
        </div>

        {chatHistory.length > 0 && (
          <button
            onClick={onClearChat}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer text-xs flex items-center gap-1 font-medium"
            title="Clear Chat History"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear
          </button>
        )}
      </div>

      {/* Messages viewport */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {chatHistory.length === 0 && !streamingText && (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-800/60 flex items-center justify-center text-slate-400">
              <Bot className="w-6 h-6 text-indigo-500" />
            </div>
            <div className="space-y-1">
              <h5 className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                Scholarly Discussion Room
              </h5>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                Ask specific questions about your uploaded datasets, computed statistical results, or manual observation notes.
              </p>
            </div>

            {/* Quick Suggestions list */}
            <div className="w-full max-w-sm space-y-1.5 pt-3">
              {suggestions.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(s)}
                  className="w-full text-left text-[11px] px-3.5 py-2 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 hover:bg-indigo-50/40 hover:border-indigo-500/20 text-slate-600 dark:text-slate-400 transition-all cursor-pointer flex items-center justify-between"
                >
                  <span className="truncate">{s}</span>
                  <HelpCircle className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Render Chat History */}
        {chatHistory.map((msg) => {
          const isModel = msg.role === 'model';
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-2.5 ${isModel ? 'justify-start' : 'justify-end'}`}
            >
              {isModel && (
                <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0 mt-0.5 border border-indigo-100/40 dark:border-indigo-900/20">
                  <Bot className="w-4 h-4" />
                </div>
              )}
              
              <div
                className={`p-3 rounded-2xl max-w-[85%] text-xs leading-relaxed whitespace-pre-line ${
                  isModel 
                    ? 'bg-slate-50 dark:bg-slate-800/40 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-800/50' 
                    : 'bg-indigo-600 text-white rounded-tr-none shadow-md shadow-indigo-500/5'
                }`}
              >
                {msg.text}
              </div>

              {!isModel && (
                <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          );
        })}

        {/* Live streaming message buffer */}
        {streamingText && (
          <div className="flex items-start gap-2.5 justify-start">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-3 rounded-2xl max-w-[85%] text-xs leading-relaxed whitespace-pre-line bg-slate-50 dark:bg-slate-800/40 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-800/50">
              {streamingText}
              <span className="inline-block w-1.5 h-3 bg-indigo-500 animate-pulse ml-1" />
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 text-rose-700 dark:text-rose-400 text-[11px] rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        {/* Anchor for scroll */}
        <div ref={messagesEndRef} />
      </div>

      {/* Input row */}
      <div className="p-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex gap-2">
        <input
          type="text"
          disabled={loading}
          placeholder={loading ? 'Waiting for AI Companion...' : 'Ask about outliers, correlations, hypothesis...'}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 text-xs px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
        />
        <button
          onClick={() => handleSend(inputText)}
          disabled={loading || !inputText.trim()}
          id="send-chat-btn"
          className="p-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl shadow-sm cursor-pointer transition-all flex items-center justify-center flex-shrink-0"
        >
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>

    </div>
  );
}
