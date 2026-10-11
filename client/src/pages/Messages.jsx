import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import ConversationList from '../components/ConversationList';
import ConversationThread from '../components/ConversationThread';
import { apiFetch } from '../utils/apiFetch';
import { useRefreshUnreadCount } from '../hooks/useUnreadCount';

const POLL_MS = 15_000;

export default function Messages() {
  const { conversationId } = useParams();
  const { currentUser } = useSelector((state) => state.user);
  const refreshUnreadCount = useRefreshUnreadCount();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

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

  return (
    <main className='max-w-6xl mx-auto p-3'>
      <h1 className='text-3xl font-semibold text-slate-700 my-5'>Messages</h1>
      <div className='flex border rounded-lg bg-white min-h-[70vh] overflow-hidden'>
        {/* On small screens show either the list or the open thread. */}
        <aside
          className={`w-full md:w-80 md:border-r overflow-y-auto ${conversationId ? 'hidden md:block' : ''}`}
        >
          {loading && <p className='p-4 text-slate-600'>Loading...</p>}
          {error && <p className='p-4 text-red-700'>Could not load your messages.</p>}
          {!loading && !error && (
            <ConversationList
              conversations={conversations}
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
