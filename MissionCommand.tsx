import React, { useState, useEffect, useRef } from 'react';
import { sendMessageToCommander } from '../services/geminiService';
import { ChatMessage, GameStatus } from '../types';
import { COLORS } from '../constants';

interface MissionCommandProps {
  gameStatus: GameStatus;
  score: number;
  wave: number;
}

const MissionCommand: React.FC<MissionCommandProps> = ({ gameStatus, score, wave }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: 'Commander Nova online. Systems nominal. Awaiting orders.', timestamp: Date.now() }
  ]);
  const [input, setInput] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMsg: ChatMessage = { role: 'user', text: input, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    const context = `Status: ${GameStatus[gameStatus]}, Wave: ${wave}, Score: ${score}`;
    const response = await sendMessageToCommander(userMsg.text, context);

    const aiMsg: ChatMessage = { role: 'model', text: response, timestamp: Date.now() };
    setMessages(prev => [...prev, aiMsg]);
    setIsTyping(false);
  };

  return (
    <div className={`fixed z-40 transition-all duration-300 ease-in-out ${isOpen ? 'bottom-0 right-0 w-full md:w-96 h-1/2 md:h-96' : 'bottom-4 right-4 w-16 h-16 rounded-full'}`}>
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="w-full h-full rounded-full bg-cyan-600/90 shadow-lg shadow-cyan-500/50 flex items-center justify-center border-2 border-cyan-400 hover:scale-110 transition-transform"
        >
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </button>
      )}

      {isOpen && (
        <div className="flex flex-col h-full bg-slate-900/95 border-t-2 md:border-2 border-cyan-500 shadow-2xl backdrop-blur-md md:rounded-tl-xl overflow-hidden">
          {/* Header */}
          <div className="flex justify-between items-center p-3 bg-slate-800 border-b border-cyan-700">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
              <span className="font-display font-bold text-cyan-300">COMMANDER NOVA</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide bg-black/40">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-2 rounded-lg text-sm font-medium ${
                  msg.role === 'user' 
                    ? 'bg-cyan-900/80 text-cyan-100 rounded-br-none border border-cyan-700' 
                    : 'bg-slate-800/90 text-gray-200 rounded-bl-none border border-slate-600'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-slate-800/90 p-2 rounded-lg rounded-bl-none border border-slate-600">
                  <span className="flex space-x-1">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}/>
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}/>
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}/>
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 bg-slate-800 border-t border-cyan-900 flex space-x-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Request tactical support..."
              className="flex-1 bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 placeholder-slate-500"
            />
            <button 
              onClick={handleSend}
              disabled={isTyping}
              className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded font-bold text-sm transition-colors disabled:opacity-50"
            >
              SEND
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MissionCommand;