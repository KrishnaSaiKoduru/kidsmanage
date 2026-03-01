import { useState, useEffect, useRef } from 'react';
import {
  MessageSquare, Search, Send, Plus, X, ArrowLeft, Users, Check,
} from 'lucide-react';
import { api } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import Spinner from './ui/Spinner';

const COLORS = ['bg-rose-500', 'bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500', 'bg-teal-500'];
const ROLE_BADGES = {
  ADMIN: { label: 'Admin', cls: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
  CARETAKER: { label: 'Caretaker', cls: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300' },
  PARENT: { label: 'Parent', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
};

export default function MessagesView() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const messagesEndRef = useRef(null);
  const { user } = useAuth();
  const toast = useToast();

  // New conversation modal state
  const [centerUsers, setCenterUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [groupTitle, setGroupTitle] = useState('');

  const fetchConversations = (showErrors = true) => {
    api.get('/messages/conversations')
      .then(setConversations)
      .catch((err) => { if (showErrors) toast.error(err.message); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchConversations(); }, []);

  // Poll conversations and messages, pausing when tab is hidden
  useEffect(() => {
    let convoInterval = null;
    let msgInterval = null;

    const startPolling = () => {
      convoInterval = setInterval(() => fetchConversations(false), 10000);
      msgInterval = setInterval(() => {
        if (!activeId) return;
        api.get(`/messages/conversations/${activeId}/messages`).then((msgs) => {
          setMessages(msgs);
          if (msgs.some((m) => m.isUnread)) {
            markAsRead(activeId);
          }
        }).catch(() => {});
      }, 10000);
    };

    const stopPolling = () => {
      if (convoInterval) clearInterval(convoInterval);
      if (msgInterval) clearInterval(msgInterval);
      convoInterval = null;
      msgInterval = null;
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchConversations(false);
        startPolling();
      } else {
        stopPolling();
      }
    };

    if (document.visibilityState === 'visible') startPolling();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [activeId]);

  const loadMessages = async (convId) => {
    setMessagesLoading(true);
    try {
      const msgs = await api.get(`/messages/conversations/${convId}/messages`);
      setMessages(msgs);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setMessagesLoading(false);
    }
  };

  const markAsRead = (convId) => {
    // Optimistic update: set unreadCount to 0 locally instead of refetching
    setConversations((prev) =>
      prev.map((c) => c.id === convId ? { ...c, unreadCount: 0 } : c)
    );
    api.put(`/messages/conversations/${convId}/read`).catch(() => {});
  };

  const openConvo = (id) => {
    setActiveId(id);
    setShowMobileChat(true);
    loadMessages(id);
    markAsRead(id);
  };

  const sendMessage = async () => {
    if (!inputText.trim() || !activeId) return;
    const content = inputText;
    setInputText('');
    // Optimistic update: append message to local state immediately
    const optimisticMsg = {
      id: `optimistic-${Date.now()}`,
      conversationId: activeId,
      content,
      type: 'text',
      createdAt: new Date().toISOString(),
      sender: { id: user?.id, name: user?.name, role: user?.role },
      isUnread: false,
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    try {
      await api.post(`/messages/conversations/${activeId}/messages`, { content });
      // Refresh conversations to update last message preview
      fetchConversations(false);
    } catch (err) {
      // Remove optimistic message on failure
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
      setInputText(content);
      toast.error(err.message);
    }
  };

  const openNewModal = async () => {
    setShowNewModal(true);
    setSelectedUsers([]);
    setUserSearch('');
    setGroupTitle('');
    setUsersLoading(true);
    try {
      const users = await api.get('/messages/conversations/users');
      setCenterUsers(users);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUsersLoading(false);
    }
  };

  const toggleUser = (u) => {
    setSelectedUsers((prev) =>
      prev.find((s) => s.id === u.id) ? prev.filter((s) => s.id !== u.id) : [...prev, u]
    );
  };

  const handleCreateConversation = async () => {
    if (selectedUsers.length === 0) return;
    try {
      const payload = { participantIds: selectedUsers.map((u) => u.id) };
      if (selectedUsers.length > 1 && groupTitle.trim()) {
        payload.title = groupTitle.trim();
      }
      const conv = await api.post('/messages/conversations', payload);
      setShowNewModal(false);
      // Add new conversation to local state and open it (openConvo handles markAsRead)
      setConversations((prev) => [{ ...conv, lastMessage: null, unreadCount: 0 }, ...prev]);
      openConvo(conv.id);
    } catch (err) {
      toast.error(err.message);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (loading) return <Spinner />;

  const activeConvo = conversations.find((c) => c.id === activeId);
  const filteredConvos = conversations.filter((c) => {
    const q = searchQuery.toLowerCase();
    const titleMatch = (c.title || '').toLowerCase().includes(q);
    const participantMatch = (c.participants || []).some((p) => p.name?.toLowerCase().includes(q));
    return titleMatch || participantMatch;
  });

  const getConvoDisplayName = (convo) => {
    if (!convo) return 'Conversation';
    if (convo.isGroup) return convo.title || 'Group Chat';
    const other = (convo.participants || []).find((p) => p.id !== user?.id);
    return other?.name || convo.title || 'Conversation';
  };

  const getConvoRole = (convo) => {
    if (!convo || convo.isGroup) return null;
    const other = (convo.participants || []).find((p) => p.id !== user?.id);
    return other?.role || null;
  };

  const getInitials = (name) => (name || 'C').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  const filteredCenterUsers = centerUsers.filter((u) =>
    u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.role.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <div className="animate-fade-slide h-[calc(100vh-8rem)] flex rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800">
      {/* Left panel */}
      <div className={`${showMobileChat ? 'hidden' : 'flex'} md:flex flex-col w-full md:w-80 lg:w-96 border-r border-gray-100 dark:border-gray-700 shrink-0`}>
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Messages</h2>
            <button onClick={openNewModal} className="p-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors">
              <Plus size={16} />
            </button>
          </div>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search conversations..."
              className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-400 dark:text-gray-200" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-700/50">
          {filteredConvos.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">No conversations yet</div>
          ) : filteredConvos.map((c, i) => {
            const displayName = getConvoDisplayName(c);
            const role = getConvoRole(c);
            const hasUnread = (c.unreadCount || 0) > 0;
            return (
              <button key={c.id} onClick={() => openConvo(c.id)}
                className={`w-full flex items-start gap-3 p-4 text-left transition-all hover:bg-gray-50 dark:hover:bg-gray-700/50 ${activeId === c.id ? 'bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-500' : hasUnread ? 'border-l-4 border-blue-400 bg-blue-50/50 dark:bg-blue-900/10' : 'border-l-4 border-transparent'}`}>
                <div className="relative shrink-0">
                  <div className={`w-12 h-12 rounded-2xl ${COLORS[i % COLORS.length]} flex items-center justify-center text-white font-bold text-sm`}>
                    {c.isGroup ? <Users size={20} /> : getInitials(displayName)}
                  </div>
                  {hasUnread && (
                    <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 flex items-center justify-center bg-blue-600 text-white text-[10px] font-bold rounded-full shadow-sm">
                      {c.unreadCount > 99 ? '99+' : c.unreadCount}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-sm truncate ${hasUnread ? 'font-bold text-gray-900 dark:text-white' : 'font-semibold text-gray-700 dark:text-gray-300'}`}>{displayName}</span>
                    {role && ROLE_BADGES[role] && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ${ROLE_BADGES[role].cls}`}>{ROLE_BADGES[role].label}</span>
                    )}
                    <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap ml-auto shrink-0">
                      {c.lastMessage ? new Date(c.lastMessage.createdAt).toLocaleDateString() : ''}
                    </span>
                  </div>
                  {c.isGroup && (
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate mb-0.5">
                      {(c.participants || []).map((p) => p.name).join(', ')}
                    </p>
                  )}
                  <p className={`text-xs truncate ${hasUnread ? 'font-semibold text-gray-700 dark:text-gray-200' : 'text-gray-400 dark:text-gray-500'}`}>
                    {c.lastMessage ? `${c.lastMessage.sender?.name || 'Unknown'}: ${c.lastMessage.content}` : 'No messages yet'}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right panel */}
      <div className={`${!showMobileChat ? 'hidden' : 'flex'} md:flex flex-col flex-1 min-w-0`}>
        {activeConvo ? (
          <>
            <div className="h-16 px-5 flex items-center gap-3 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shrink-0">
              <button className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500" onClick={() => setShowMobileChat(false)}>
                <ArrowLeft size={20} />
              </button>
              <div className={`w-10 h-10 rounded-xl ${COLORS[conversations.indexOf(activeConvo) % COLORS.length]} flex items-center justify-center text-white font-bold text-sm`}>
                {activeConvo.isGroup ? <Users size={18} /> : getInitials(getConvoDisplayName(activeConvo))}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-gray-800 dark:text-gray-100 text-sm truncate">{getConvoDisplayName(activeConvo)}</p>
                  {getConvoRole(activeConvo) && ROLE_BADGES[getConvoRole(activeConvo)] && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ${ROLE_BADGES[getConvoRole(activeConvo)].cls}`}>
                      {ROLE_BADGES[getConvoRole(activeConvo)].label}
                    </span>
                  )}
                </div>
                {activeConvo.isGroup && (
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">
                    {(activeConvo.participants || []).map((p) => p.name).join(', ')}
                  </p>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50 dark:bg-gray-900/30">
              {messagesLoading ? <Spinner /> : messages.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-8">No messages yet. Start the conversation!</p>
              ) : (() => {
                const firstUnreadIdx = messages.findIndex((m) => m.isUnread);
                return messages.map((msg, idx) => {
                  const isMe = msg.sender?.id === user?.id;
                  const showUnreadBanner = idx === firstUnreadIdx;
                  return (
                    <div key={msg.id}>
                      {showUnreadBanner && (
                        <div className="flex items-center gap-3 my-2">
                          <div className="flex-1 h-px bg-blue-400/50" />
                          <span className="text-[11px] font-bold text-blue-500 dark:text-blue-400 px-3 py-1 bg-blue-50 dark:bg-blue-900/30 rounded-full">
                            Unread Messages
                          </span>
                          <div className="flex-1 h-px bg-blue-400/50" />
                        </div>
                      )}
                      <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} gap-2`}>
                        {!isMe && (
                          <div className="w-8 h-8 rounded-xl bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-white text-xs font-bold shrink-0 self-end">
                            {msg.sender?.name?.[0] || '?'}
                          </div>
                        )}
                        <div className={`max-w-[70%] flex flex-col gap-1 ${isMe ? 'items-end' : 'items-start'}`}>
                          {!isMe && (
                            <div className="flex items-center gap-1.5 ml-1">
                              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{msg.sender?.name || 'Unknown'}</span>
                              {msg.sender?.role && ROLE_BADGES[msg.sender.role] && (
                                <span className={`text-[9px] font-bold px-1 py-0.5 rounded ${ROLE_BADGES[msg.sender.role].cls}`}>
                                  {ROLE_BADGES[msg.sender.role].label}
                                </span>
                              )}
                            </div>
                          )}
                          <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${isMe
                            ? 'bg-blue-600 text-white rounded-br-sm shadow-sm'
                            : msg.isUnread
                              ? 'bg-blue-50 dark:bg-blue-900/30 text-gray-800 dark:text-gray-200 border border-blue-200 dark:border-blue-700 rounded-bl-sm shadow-sm ring-1 ring-blue-300/50 dark:ring-blue-600/50'
                              : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-gray-600 rounded-bl-sm shadow-sm'}`}>
                            {msg.content}
                          </div>
                          <span className="text-[10px] text-gray-400 dark:text-gray-500">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shrink-0">
              <div className="flex items-end gap-2 bg-gray-50 dark:bg-gray-700/60 rounded-2xl px-3 py-2 border border-gray-200 dark:border-gray-600 focus-within:ring-2 focus-within:ring-blue-400">
                <textarea value={inputText} onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder="Type a message..."
                  rows={1}
                  className="flex-1 bg-transparent outline-none text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 resize-none max-h-28" />
                <button onClick={sendMessage}
                  className={`p-2 rounded-xl font-bold transition-all shrink-0 ${inputText.trim() ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm' : 'bg-gray-200 dark:bg-gray-600 text-gray-400 cursor-not-allowed'}`}>
                  <Send size={16} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center p-8">
            <div>
              <div className="p-6 bg-gray-100 dark:bg-gray-700 rounded-full inline-block mb-4">
                <MessageSquare size={40} className="text-gray-400 dark:text-gray-500" />
              </div>
              <p className="text-gray-500 dark:text-gray-400 font-medium">Select a conversation to start</p>
              <button onClick={openNewModal} className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-semibold">
                or start a new message
              </button>
            </div>
          </div>
        )}
      </div>

      {/* New Conversation Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl border border-gray-100 dark:border-gray-700 flex flex-col max-h-[80vh]">
            {/* Modal header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700 shrink-0">
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">New Message</h3>
              <button onClick={() => setShowNewModal(false)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"><X size={18} /></button>
            </div>

            {/* Search */}
            <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700 shrink-0">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={userSearch} onChange={(e) => setUserSearch(e.target.value)} placeholder="Search by name, email, or role..."
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-400 dark:text-gray-200" />
              </div>
            </div>

            {/* Selected users chips */}
            {selectedUsers.length > 0 && (
              <div className="px-5 py-2 flex flex-wrap gap-1.5 border-b border-gray-100 dark:border-gray-700 shrink-0">
                {selectedUsers.map((u) => (
                  <span key={u.id} className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-semibold">
                    {u.name}
                    <button onClick={() => toggleUser(u)} className="hover:text-blue-900 dark:hover:text-blue-100"><X size={12} /></button>
                  </span>
                ))}
              </div>
            )}

            {/* Group title input (when multiple users selected) */}
            {selectedUsers.length > 1 && (
              <div className="px-5 py-2 border-b border-gray-100 dark:border-gray-700 shrink-0">
                <input value={groupTitle} onChange={(e) => setGroupTitle(e.target.value)} placeholder="Group name (optional)"
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-400 dark:text-gray-200" />
              </div>
            )}

            {/* User list */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {usersLoading ? (
                <div className="p-8 flex justify-center"><Spinner /></div>
              ) : filteredCenterUsers.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-400">
                  {centerUsers.length === 0 ? 'No other users in your center yet' : 'No users match your search'}
                </div>
              ) : filteredCenterUsers.map((u) => {
                const isSelected = selectedUsers.some((s) => s.id === u.id);
                const badge = ROLE_BADGES[u.role];
                return (
                  <button key={u.id} onClick={() => toggleUser(u)}
                    className={`w-full flex items-center gap-3 px-5 py-3 text-left transition-all hover:bg-gray-50 dark:hover:bg-gray-700/50 ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                    <div className={`w-10 h-10 rounded-xl ${COLORS[centerUsers.indexOf(u) % COLORS.length]} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                      {getInitials(u.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 truncate">{u.name}</span>
                        {badge && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${badge.cls}`}>{badge.label}</span>}
                      </div>
                      <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{u.email}</p>
                    </div>
                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300 dark:border-gray-600'}`}>
                      {isSelected && <Check size={14} className="text-white" />}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Modal footer */}
            <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex gap-3 shrink-0">
              <button onClick={() => setShowNewModal(false)} className="flex-1 px-4 py-3 font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600">Cancel</button>
              <button onClick={handleCreateConversation} disabled={selectedUsers.length === 0}
                className={`flex-1 px-4 py-3 font-bold rounded-xl shadow-sm transition-all ${selectedUsers.length > 0 ? 'text-white bg-blue-600 hover:bg-blue-700' : 'text-gray-400 bg-gray-200 dark:bg-gray-600 cursor-not-allowed'}`}>
                {selectedUsers.length > 1 ? 'Create Group' : 'Start Chat'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
