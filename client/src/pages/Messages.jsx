import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { FaCheckDouble, FaDownload } from 'react-icons/fa';
import ConversationList from '../components/ConversationList';
import ConversationThread from '../components/ConversationThread';
import { apiFetch } from '../utils/apiFetch';
import { downloadCsv } from '../utils/downloadCsv';
import { useRefreshUnreadCount } from '../hooks/useUnreadCount';

const POLL_MS = 15_000;

export default function Messages() {
  const { conversationId } = useParams();
  const { currentUser } = useSelector((state) => state.user);
  const refreshUnreadCount = useRefreshUnreadCount();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [marking, setMarking] = useState(false);

  const loadConversations = useCallback(async () => {
    try {
      const res = await apiFetch('/api/messages/conversations');
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error(data.message);
      setConversations(data);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') loadConversations();
    }, POLL_MS);
    return () => clearInterval(interval);
  }, [loadConversations]);

  // Opening or replying in a thread changes unread counts and previews.
  const handleThreadActivity = useCallback(() => {
    loadConversations();
    refreshUnreadCount();
  }, [loadConversations, refreshUnreadCount]);

  const markAllRead = async () => {
    setMarking(true);
    try {
      await apiFetch('/api/messages/read-all', { method: 'POST' });
      await handleThreadActivity();
    } finally {
      setMarking(false);
    }
  };

  const term = search.trim().toLowerCase();
  const visible = term
    ? conversations.filter((c) =>
        `${c.otherUser?.username ?? ''} ${c.listing?.name ?? ''}`.toLowerCase().includes(term)
      )
    : conversations;

  return (
    <main className='max-w-6xl mx-auto p-3'>
      <h1 className='text-3xl font-semibold text-slate-700 my-5'>Messages</h1>
      <div className='flex border rounded-lg bg-white min-h-[70vh] overflow-hidden'>
        {/* On small screens show either the list or the open thread. */}
        <aside
          className={`w-full md:w-80 md:border-r overflow-y-auto ${conversationId ? 'hidden md:block' : ''}`}
        >
          <div className='flex items-center gap-2 border-b p-2'>
            <input
              type='search'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder='Search conversations'
              aria-label='Search conversations'
              className='flex-1 rounded-lg border border-slate-300 p-2 text-sm'
            />
            <button
              type='button'
              onClick={markAllRead}
              disabled={marking}
              aria-label='Mark all messages as read'
              title='Mark all as read'
              className='rounded-lg p-2 text-slate-600 hover:bg-slate-100 disabled:opacity-50'
            >
              <FaCheckDouble className='h-4 w-4' aria-hidden='true' />
            </button>
            <button
              type='button'
              onClick={() => downloadCsv('/api/messages/conversations/export', 'enquiries.csv')}
              aria-label='Export conversations'
              title='Export as CSV'
              className='rounded-lg p-2 text-slate-600 hover:bg-slate-100'
            >
              <FaDownload className='h-4 w-4' aria-hidden='true' />
            </button>
          </div>
          {loading && <p className='p-4 text-slate-600'>Loading...</p>}
          {error && <p className='p-4 text-red-700'>Could not load your messages.</p>}
          {!loading && !error && visible.length === 0 && term && (
            <p className='p-4 text-slate-600'>No conversations match &ldquo;{search}&rdquo;.</p>
          )}
          {!loading && !error && (visible.length > 0 || !term) && (
            <ConversationList
              conversations={visible}
              activeId={conversationId}
              currentUserId={currentUser?._id}
            />
          )}
        </aside>
        <section className={`flex-1 min-w-0 ${conversationId ? 'flex' : 'hidden md:flex'}`}>
          {conversationId ? (
            <ConversationThread
              key={conversationId}
              conversationId={conversationId}
              onActivity={handleThreadActivity}
            />
          ) : (
            <p className='m-auto text-slate-500'>Select a conversation</p>
          )}
        </section>
      </div>
    </main>
  );
}
