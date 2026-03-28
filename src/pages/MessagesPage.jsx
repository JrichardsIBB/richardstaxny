import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAdmin } from '../context/AdminContext';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export default function MessagesPage() {
  const { user } = useAuth();
  const { isStaff, profile } = useAdmin();

  const [messages, setMessages] = useState([]);
  const [threads, setThreads] = useState([]);
  const [selectedThread, setSelectedThread] = useState(null);
  const [threadMessages, setThreadMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [composing, setComposing] = useState(false);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  // Fetch all messages for this user
  const fetchMessages = useCallback(async () => {
    if (!user) return;

    const { data } = await supabase
      .from('messages')
      .select('*, sender:profiles!messages_sender_id_fkey(full_name, email, role), recipient:profiles!messages_recipient_id_fkey(full_name, email, role)')
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    setMessages(data || []);

    // Group into threads by subject or parent
    const threadMap = new Map();
    for (const msg of data || []) {
      const threadKey = msg.parent_id || msg.id;
      const otherUser = msg.sender_id === user.id ? msg.recipient : msg.sender;
      if (!threadMap.has(threadKey)) {
        threadMap.set(threadKey, {
          id: threadKey,
          subject: msg.subject || '(no subject)',
          otherUser,
          lastMessage: msg,
          unread: 0,
          messages: [],
        });
      }
      const thread = threadMap.get(threadKey);
      thread.messages.push(msg);
      if (!msg.is_read && msg.recipient_id === user.id) {
        thread.unread++;
      }
      // Use earliest message's subject
      if (msg.subject && !msg.parent_id) {
        thread.subject = msg.subject;
      }
    }

    const threadList = Array.from(threadMap.values()).sort(
      (a, b) => new Date(b.lastMessage.created_at) - new Date(a.lastMessage.created_at)
    );
    setThreads(threadList);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchMessages();

    // Real-time subscription
    const channel = supabase
      .channel('messages-page')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        fetchMessages();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchMessages]);

  // Load thread messages when selected
  useEffect(() => {
    if (!selectedThread) return;

    const thread = threads.find((t) => t.id === selectedThread);
    if (thread) {
      const sorted = [...thread.messages].sort(
        (a, b) => new Date(a.created_at) - new Date(b.created_at)
      );
      setThreadMessages(sorted);

      // Mark unread messages as read
      const unread = sorted.filter((m) => !m.is_read && m.recipient_id === user.id);
      if (unread.length > 0) {
        supabase
          .from('messages')
          .update({ is_read: true })
          .in('id', unread.map((m) => m.id))
          .then(() => {
            // Also mark notifications as read
            supabase
              .from('notifications')
              .update({ is_read: true })
              .eq('user_id', user.id)
              .eq('type', 'message')
              .in('metadata->>message_id', unread.map((m) => m.id));
          });
      }
    }
  }, [selectedThread, threads, user]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [threadMessages]);

  async function handleSend(e) {
    e.preventDefault();
    if (!newMessage.trim()) return;
    setSending(true);

    try {
      // Determine recipient
      let recipientId;
      if (composing) {
        // New message — send to first owner
        const { data: owners } = await supabase
          .from('profiles')
          .select('id')
          .eq('role', 'owner')
          .limit(1);

        if (!owners || owners.length === 0) {
          toast.error('No staff available to receive messages');
          return;
        }
        recipientId = owners[0].id;

        const { error } = await supabase.from('messages').insert({
          sender_id: user.id,
          recipient_id: recipientId,
          subject: newSubject.trim() || 'General Inquiry',
          content: newMessage.trim(),
          is_staff_message: isStaff,
        });

        if (error) throw error;
        setComposing(false);
        setNewSubject('');
      } else {
        // Reply to thread
        const thread = threads.find((t) => t.id === selectedThread);
        const lastMsg = thread?.lastMessage;
        recipientId = lastMsg?.sender_id === user.id ? lastMsg?.recipient_id : lastMsg?.sender_id;

        const { error } = await supabase.from('messages').insert({
          sender_id: user.id,
          recipient_id: recipientId,
          content: newMessage.trim(),
          parent_id: selectedThread,
          is_staff_message: isStaff,
        });

        if (error) throw error;
      }

      setNewMessage('');
      toast.success('Message sent!');
      await fetchMessages();
    } catch (err) {
      toast.error(`Failed to send: ${err.message}`);
    } finally {
      setSending(false);
    }
  }

  function timeAgo(dateStr) {
    const now = new Date();
    const date = new Date(dateStr);
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
          <button
            onClick={() => { setComposing(true); setSelectedThread(null); }}
            className="rounded-lg bg-brand-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-blue-600 transition flex items-center gap-2"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Message
          </button>
        </div>

        <div className="flex gap-4 h-[calc(100vh-200px)] min-h-[500px]">
          {/* Thread List */}
          <div className="w-80 shrink-0 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Conversations</p>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="h-6 w-6 animate-spin rounded-full border-4 border-brand-blue-500 border-t-transparent" />
                </div>
              ) : threads.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-500 text-sm">
                  No messages yet
                </div>
              ) : (
                threads.map((thread) => (
                  <button
                    key={thread.id}
                    onClick={() => { setSelectedThread(thread.id); setComposing(false); }}
                    className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                      selectedThread === thread.id ? 'bg-brand-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm truncate ${thread.unread > 0 ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                        {thread.subject}
                      </p>
                      <div className="flex items-center gap-2 shrink-0">
                        {thread.unread > 0 && (
                          <span className="h-5 w-5 rounded-full bg-brand-blue-500 text-[10px] font-bold text-white flex items-center justify-center">
                            {thread.unread}
                          </span>
                        )}
                        <span className="text-xs text-gray-400">{timeAgo(thread.lastMessage.created_at)}</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                      {thread.otherUser?.full_name || thread.otherUser?.email || 'Staff'}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      {thread.lastMessage.content}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Message View / Compose */}
          <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
            {composing ? (
              /* Compose New Message */
              <div className="flex flex-col h-full">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h2 className="font-semibold text-gray-900">New Message</h2>
                  <p className="text-xs text-gray-500">Send a message to Richards Tax NY</p>
                </div>
                <div className="flex-1 px-6 py-4">
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                    <input
                      type="text"
                      value={newSubject}
                      onChange={(e) => setNewSubject(e.target.value)}
                      placeholder="e.g., Question about my tax return"
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-brand-blue-500 focus:outline-none focus:ring-2 focus:ring-brand-blue-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message..."
                      rows={8}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-brand-blue-500 focus:outline-none focus:ring-2 focus:ring-brand-blue-500/20 resize-none"
                    />
                  </div>
                </div>
                <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between">
                  <button
                    onClick={() => setComposing(false)}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSend}
                    disabled={sending || !newMessage.trim()}
                    className="rounded-lg bg-brand-blue-500 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-blue-600 disabled:opacity-50 transition flex items-center gap-2"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                    </svg>
                    {sending ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </div>
            ) : selectedThread ? (
              /* Thread View */
              <div className="flex flex-col h-full">
                {/* Thread Header */}
                <div className="px-6 py-4 border-b border-gray-100">
                  <h2 className="font-semibold text-gray-900">
                    {threads.find((t) => t.id === selectedThread)?.subject || 'Message'}
                  </h2>
                  <p className="text-xs text-gray-500">
                    with {threads.find((t) => t.id === selectedThread)?.otherUser?.full_name || 'Staff'}
                  </p>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                  {threadMessages.map((msg) => {
                    const isMe = msg.sender_id === user.id;
                    return (
                      <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                          isMe
                            ? 'bg-brand-blue-500 text-white rounded-br-md'
                            : 'bg-gray-100 text-gray-800 rounded-bl-md'
                        }`}>
                          <p className="text-sm leading-relaxed">{msg.content}</p>
                          <p className={`text-[10px] mt-1 ${isMe ? 'text-white/60' : 'text-gray-400'}`}>
                            {new Date(msg.created_at).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Reply Input */}
                <form onSubmit={handleSend} className="px-4 py-3 border-t border-gray-100 flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a reply..."
                    className="flex-1 rounded-full border border-gray-300 px-4 py-2.5 text-sm focus:border-brand-blue-500 focus:outline-none focus:ring-1 focus:ring-brand-blue-500/30"
                  />
                  <button
                    type="submit"
                    disabled={sending || !newMessage.trim()}
                    className="rounded-full bg-brand-blue-500 p-2.5 text-white hover:bg-brand-blue-600 disabled:opacity-50 transition"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                    </svg>
                  </button>
                </form>
              </div>
            ) : (
              /* Empty State */
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <svg className="h-16 w-16 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                </svg>
                <p className="text-sm">Select a conversation or start a new message</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
