import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAdmin } from '../context/AdminContext';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export default function MessagesPage() {
  const { user } = useAuth();
  const { isStaff, profile } = useAdmin();

  const [conversations, setConversations] = useState([]);
  const [selectedConv, setSelectedConv] = useState(null);
  const [convMessages, setConvMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [composing, setComposing] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [staffUsers, setStaffUsers] = useState([]);
  const [selectedRecipient, setSelectedRecipient] = useState('');
  const messagesEndRef = useRef(null);

  // Fetch conversations (grouped by thread)
  const fetchConversations = useCallback(async () => {
    if (!user) return;

    const { data: msgs } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    // Get all unique user IDs from messages
    const userIds = new Set();
    (msgs || []).forEach((m) => {
      userIds.add(m.sender_id);
      if (m.recipient_id) userIds.add(m.recipient_id);
    });

    // Fetch profiles for those users
    let profileMap = {};
    if (userIds.size > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, avatar_url')
        .in('id', Array.from(userIds));
      (profiles || []).forEach((p) => { profileMap[p.id] = p; });
    }

    // Group into conversations by thread root
    const threadMap = new Map();
    for (const msg of msgs || []) {
      const threadId = msg.parent_id || msg.id;
      const otherId = msg.sender_id === user.id ? msg.recipient_id : msg.sender_id;
      const otherUser = profileMap[otherId];

      if (!threadMap.has(threadId)) {
        threadMap.set(threadId, {
          id: threadId,
          subject: msg.parent_id ? null : msg.subject,
          otherUser,
          lastMessage: msg,
          unreadCount: 0,
          messages: [],
        });
      }

      const conv = threadMap.get(threadId);
      conv.messages.push({ ...msg, senderProfile: profileMap[msg.sender_id] });

      if (!msg.is_read && msg.recipient_id === user.id) {
        conv.unreadCount++;
      }

      // Use root message subject
      if (!msg.parent_id && msg.subject) {
        conv.subject = msg.subject;
      }

      // Keep latest message
      if (new Date(msg.created_at) > new Date(conv.lastMessage.created_at)) {
        conv.lastMessage = msg;
      }
    }

    const convList = Array.from(threadMap.values()).sort(
      (a, b) => new Date(b.lastMessage.created_at) - new Date(a.lastMessage.created_at)
    );
    setConversations(convList);
    setLoading(false);

    // Auto-select first if none selected
    if (!selectedConv && convList.length > 0) {
      setSelectedConv(convList[0].id);
    }
  }, [user, selectedConv]);

  // Fetch staff users for compose (tax filers see staff, staff sees everyone)
  useEffect(() => {
    async function fetchRecipients() {
      if (isStaff) {
        // Staff can message any tax filer
        const { data } = await supabase
          .from('profiles')
          .select('id, full_name, email, role')
          .eq('role', 'tax_filer')
          .order('full_name');
        setStaffUsers(data || []);
      } else {
        // Tax filers can message staff/owners
        const { data } = await supabase
          .from('profiles')
          .select('id, full_name, email, role')
          .in('role', ['owner', 'admin', 'tax_agent'])
          .order('full_name');
        setStaffUsers(data || []);
      }
    }
    fetchRecipients();
  }, [isStaff]);

  useEffect(() => {
    fetchConversations();

    const channel = supabase
      .channel('messages-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        fetchConversations();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchConversations]);

  // Load selected conversation messages
  useEffect(() => {
    if (!selectedConv) return;
    const conv = conversations.find((c) => c.id === selectedConv);
    if (!conv) return;

    const sorted = [...conv.messages].sort(
      (a, b) => new Date(a.created_at) - new Date(b.created_at)
    );
    setConvMessages(sorted);

    // Mark unread as read
    const unread = sorted.filter((m) => !m.is_read && m.recipient_id === user.id);
    if (unread.length > 0) {
      supabase
        .from('messages')
        .update({ is_read: true })
        .in('id', unread.map((m) => m.id))
        .then(() => {
          supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', user.id)
            .eq('type', 'message');
        });
    }
  }, [selectedConv, conversations, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [convMessages]);

  async function handleSend(e) {
    e.preventDefault();
    if (!messageText.trim()) return;
    setSending(true);

    try {
      if (composing) {
        // New conversation
        if (!selectedRecipient) {
          toast.error('Please select a recipient');
          setSending(false);
          return;
        }

        const { error } = await supabase.from('messages').insert({
          sender_id: user.id,
          recipient_id: selectedRecipient,
          subject: newSubject.trim() || 'General Inquiry',
          content: messageText.trim(),
          is_staff_message: isStaff,
        });
        if (error) throw error;
        setComposing(false);
        setNewSubject('');
        setSelectedRecipient('');
      } else {
        // Reply to thread
        const conv = conversations.find((c) => c.id === selectedConv);
        const lastMsg = conv?.lastMessage;
        const recipientId = lastMsg?.sender_id === user.id ? lastMsg?.recipient_id : lastMsg?.sender_id;

        const { error } = await supabase.from('messages').insert({
          sender_id: user.id,
          recipient_id: recipientId,
          content: messageText.trim(),
          parent_id: selectedConv,
          is_staff_message: isStaff,
        });
        if (error) throw error;
      }

      setMessageText('');
      await fetchConversations();
    } catch (err) {
      toast.error(`Failed: ${err.message}`);
    } finally {
      setSending(false);
    }
  }

  function formatTime(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now - date) / 86400000);

    if (diffDays === 0) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }
    if (diffDays < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  }

  const filteredConversations = searchQuery
    ? conversations.filter((c) =>
        c.otherUser?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.lastMessage?.content?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : conversations;

  const selectedConvData = conversations.find((c) => c.id === selectedConv);

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="flex h-[calc(100vh-120px)] min-h-[500px] gap-0 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

          {/* Left Panel — Conversations */}
          <div className="w-80 shrink-0 border-r border-gray-200 flex flex-col">
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h1 className="text-lg font-bold text-gray-900">Messages</h1>
              <button
                onClick={() => { setComposing(true); setSelectedConv(null); }}
                className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition"
                title="New message"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>
              </button>
            </div>

            {/* Search */}
            <div className="px-4 py-3">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search messages"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm focus:border-brand-blue-500 focus:outline-none focus:bg-white"
                />
              </div>
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="h-5 w-5 animate-spin rounded-full border-3 border-brand-blue-500 border-t-transparent" />
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="px-5 py-8 text-center text-gray-400 text-sm">
                  {conversations.length === 0 ? 'No conversations yet' : 'No results'}
                </div>
              ) : (
                filteredConversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => { setSelectedConv(conv.id); setComposing(false); }}
                    className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors border-b border-gray-50 ${
                      selectedConv === conv.id ? 'bg-brand-blue-50' : ''
                    }`}
                  >
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      {conv.otherUser?.avatar_url ? (
                        <img src={conv.otherUser.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-brand-blue-100 flex items-center justify-center">
                          <span className="text-sm font-semibold text-brand-blue-600">
                            {getInitials(conv.otherUser?.full_name)}
                          </span>
                        </div>
                      )}
                      {conv.unreadCount > 0 && (
                        <span className="absolute -right-1 -top-1 h-5 w-5 rounded-full bg-brand-blue-500 text-[10px] font-bold text-white flex items-center justify-center ring-2 ring-white">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {conv.otherUser?.full_name || conv.otherUser?.email || 'Unknown'}
                        </p>
                        <span className="text-[11px] text-gray-400 shrink-0">
                          {formatTime(conv.lastMessage.created_at)}
                        </span>
                      </div>
                      {conv.subject && (
                        <p className="text-xs text-gray-500 truncate">{conv.subject}</p>
                      )}
                      <p className={`text-xs mt-0.5 truncate ${conv.unreadCount > 0 ? 'font-semibold text-gray-800' : 'text-gray-400'}`}>
                        {conv.lastMessage.sender_id === user.id ? 'You: ' : ''}
                        {conv.lastMessage.content}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Right Panel — Messages */}
          <div className="flex-1 flex flex-col">
            {composing ? (
              /* Compose New */
              <div className="flex flex-col h-full">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h2 className="font-semibold text-gray-900">New Message</h2>
                </div>
                <div className="flex-1 px-6 py-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                    <select value={selectedRecipient} onChange={(e) => setSelectedRecipient(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-blue-500 focus:outline-none">
                      <option value="">Select recipient...</option>
                      {staffUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.full_name || u.email} ({u.role?.replace('_', ' ')})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                    <input type="text" value={newSubject} onChange={(e) => setNewSubject(e.target.value)}
                      placeholder="e.g., Question about my tax return"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-blue-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                    <textarea value={messageText} onChange={(e) => setMessageText(e.target.value)}
                      placeholder="Type your message..." rows={8}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-blue-500 focus:outline-none resize-none" />
                  </div>
                </div>
                <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between">
                  <button onClick={() => { setComposing(false); setMessageText(''); }} className="text-sm text-gray-500 hover:text-gray-700">Cancel</button>
                  <button onClick={handleSend} disabled={sending || !messageText.trim() || !selectedRecipient}
                    className="rounded-lg bg-brand-blue-500 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-blue-600 disabled:opacity-50 transition flex items-center gap-2">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                    </svg>
                    {sending ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </div>
            ) : selectedConvData ? (
              /* Conversation View */
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="px-6 py-3 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {selectedConvData.otherUser?.avatar_url ? (
                      <img src={selectedConvData.otherUser.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-brand-blue-100 flex items-center justify-center">
                        <span className="text-sm font-semibold text-brand-blue-600">
                          {getInitials(selectedConvData.otherUser?.full_name)}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-gray-900">
                        {selectedConvData.otherUser?.full_name || selectedConvData.otherUser?.email || 'Unknown'}
                      </p>
                      {selectedConvData.subject && (
                        <p className="text-xs text-gray-500">{selectedConvData.subject}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-gray-50/50">
                  {convMessages.map((msg) => {
                    const isMe = msg.sender_id === user.id;
                    return (
                      <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className="flex items-end gap-2 max-w-[70%]">
                          {!isMe && (
                            <div className="h-7 w-7 rounded-full bg-brand-blue-100 flex items-center justify-center shrink-0 mb-4">
                              <span className="text-[10px] font-semibold text-brand-blue-600">
                                {getInitials(msg.senderProfile?.full_name)}
                              </span>
                            </div>
                          )}
                          <div>
                            <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                              isMe
                                ? 'bg-brand-blue-500 text-white rounded-br-md'
                                : 'bg-white text-gray-800 border border-gray-200 rounded-bl-md shadow-sm'
                            }`}>
                              {msg.content}
                            </div>
                            <p className={`text-[10px] mt-1 ${isMe ? 'text-right text-gray-400' : 'text-gray-400'}`}>
                              {new Date(msg.created_at).toLocaleString('en-US', {
                                month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <form onSubmit={handleSend} className="px-4 py-3 border-t border-gray-200 bg-white flex items-center gap-3">
                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 rounded-full border border-gray-300 bg-gray-50 px-4 py-2.5 text-sm focus:border-brand-blue-500 focus:outline-none focus:bg-white"
                  />
                  <button
                    type="submit"
                    disabled={sending || !messageText.trim()}
                    className="h-10 w-10 rounded-full bg-brand-blue-500 flex items-center justify-center text-white hover:bg-brand-blue-600 disabled:opacity-50 transition shrink-0"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                    </svg>
                  </button>
                </form>
              </div>
            ) : (
              /* Empty State */
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <svg className="h-16 w-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={0.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                </svg>
                <p className="text-sm font-medium">Select a conversation</p>
                <p className="text-xs mt-1">or start a new message</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
