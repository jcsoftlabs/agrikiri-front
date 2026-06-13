'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { IS_MOCK, MOCK_MESSAGES } from '@/lib/mockData';

interface Message {
  id: string;
  content: string;
  createdAt: string;
  sender: {
    firstName: string;
    lastName: string;
    associateType: string;
    avatarUrl?: string;
  };
}

export default function AssociateChat() {
  const { user } = useAuthStore();
  const [content, setContent] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['associate-messages'],
    queryFn: async () => {
      if (IS_MOCK) return MOCK_MESSAGES as unknown as Message[];
      const response = await api.get('/associates/chat');
      return response.data.data as Message[];
    },
    refetchInterval: IS_MOCK ? false : 5000, // Poll every 5 seconds (disabled in mock)
  });

  const sendMutation = useMutation({
    mutationFn: (text: string) => {
      if (IS_MOCK) {
        toast.success('[Mock] Message envoyé (non persisté — DB hors ligne)');
        return Promise.resolve() as any;
      }
      return api.post('/associates/chat', { content: text });
    },
    onSuccess: () => {
      setContent('');
      queryClient.invalidateQueries({ queryKey: ['associate-messages'] });
    },
    onError: () => {
      toast.error('Erreur lors de l\'envoi du message');
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || sendMutation.isPending) return;
    sendMutation.mutate(content.trim());
  };

  return (
    <div className="card flex min-h-[calc(100svh-18rem)] flex-col overflow-hidden border-none shadow-xl md:h-[600px] md:min-h-0">
      {/* Chat Header */}
      <div className="flex items-center justify-between border-b border-gray-100 bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-agri-green-100 flex items-center justify-center text-agri-green-700">
            💬
          </div>
          <div>
            <h3 className="font-bold text-agri-dark">Salon Général des Associés</h3>
            <p className="text-xs text-gray-400">Canal sécurisé de communication interne</p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto bg-gray-50/30 px-4 py-4 pb-28 space-y-5 md:px-6 md:py-6 md:pb-6"
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-gray-400">Chargement des messages...</div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400 italic">Aucun message pour le moment.</div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender.firstName === user?.firstName && msg.sender.lastName === user?.lastName;
            return (
              <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                <div className="w-9 h-9 rounded-full bg-agri-green-200 shrink-0 overflow-hidden flex items-center justify-center text-sm font-bold text-agri-green-800">
                  {msg.sender.avatarUrl ? <img src={msg.sender.avatarUrl} alt="avatar" /> : msg.sender.firstName[0]}
                </div>
                <div className={`flex flex-col max-w-[80%] ${isMe ? 'items-end' : ''}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-gray-700">{msg.sender.firstName} {msg.sender.lastName}</span>
                    <span className="text-[10px] uppercase font-bold text-agri-green-600 bg-agri-green-50 px-1.5 py-0.5 rounded">
                      {msg.sender.associateType}
                    </span>
                    <span className="text-[10px] text-gray-400">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                    isMe
                      ? 'bg-agri-green-700 text-white rounded-tr-none shadow-md shadow-agri-green-100'
                      : 'bg-white text-gray-700 border border-gray-100 rounded-tl-none shadow-sm'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input Area */}
      <div className="sticky bottom-0 border-t border-gray-100 bg-white/95 p-3 backdrop-blur supports-[backdrop-filter]:bg-white/85 md:p-4">
        <form onSubmit={handleSend} className="flex items-end gap-2">
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Écrivez votre message ici..."
            className="flex-1 rounded-xl border border-gray-200 bg-gray-100 px-4 py-3 text-sm focus:border-agri-green-500 focus:bg-white focus:ring-2 focus:ring-agri-green-500 transition-all"
          />
          <button
            type="submit"
            disabled={!content.trim() || sendMutation.isPending}
            className="rounded-xl bg-agri-green-600 p-3 text-white shadow-lg shadow-agri-green-100 transition-all hover:bg-agri-green-700 disabled:opacity-50"
          >
            {sendMutation.isPending ? '...' : '🚀'}
          </button>
        </form>
      </div>
    </div>
  );
}
