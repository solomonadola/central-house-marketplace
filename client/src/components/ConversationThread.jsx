import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { apiFetch } from '../utils/apiFetch';
import { formatTimeOfDay } from '../utils/formatTime';

const DEFAULT_POLL_MS = 5_000;

// Combines message lists, dropping duplicates, oldest first.
const mergeMessages = (...lists) => {
  const byId = new Map();
  lists.flat().forEach((m) => byId.set(m._id, m));
  return [...byId.values()].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
};

// pollMs is configurable mainly so tests can poll quickly with real timers.
export default function ConversationThread({ conversationId, onActivity, pollMs = DEFAULT_POLL_MS }) {
  const { currentUser } = useSelector((state) => state.user);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(null);
  const scrollRef = useRef(null);
  const stickToBottom = useRef(true);

  // Keep the latest callback without re-running effects when it changes.
  const onActivityRef = useRef(onActivity);
  onActivityRef.current = onActivity;

  const fetchLatest = useCallback(async () => {
    const res = await apiFetch(`/api/messages/conversations/${conversationId}`);
    const data = await res.json();
    if (data.success === false) throw new Error(data.message);
    return data;
  }, [conversationId]);

  // Initial load, then poll for new messages.
  useEffect(() => {
    let cancelled = false;
    let latestId = null;

    const load = async (initial) => {
      try {
        const data = await fetchLatest();
        if (cancelled) return;
        setConversation(data.conversation);
        setMessages((prev) => mergeMessages(prev, data.messages));

        // Fetching the latest page marks it read, so tell the parent
        // whenever it brought something new.
        const newestId = data.messages.at(-1)?._id ?? null;
        if (initial || newestId !== latestId) onActivityRef.current?.();
        latestId = newestId;
        if (initial) setHasMore(data.hasMore);
      } catch {
        if (!cancelled && initial) setError(true);
      } finally {
        if (!cancelled && initial) setLoading(false);
      }
    };

    load(true);
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') load(false);
    }, pollMs);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [fetchLatest, pollMs]);

  // Follow new messages unless the user scrolled up to read older ones.
  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const handleScroll = () => {
    const el = scrollRef.current;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const loadOlder = async () => {
    if (!messages.length) return;
    setLoadingOlder(true);
    stickToBottom.current = false;
    try {
      const before = encodeURIComponent(messages[0].createdAt);
      const res = await apiFetch(`/api/messages/conversations/${conversationId}?before=${before}`);
      const data = await res.json();
      if (data.success === false) return;
      setMessages((prev) => mergeMessages(data.messages, prev));
      setHasMore(data.hasMore);
    } finally {
      setLoadingOlder(false);
    }
  };

  const send = async (e) => {
    e.preventDefault();
    const text = body.trim();
    if (!text || sending) return;

    setSending(true);
    setSendError(null);
    try {
      const res = await apiFetch(`/api/messages/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: text }),
      });
      const data = await res.json();
      if (data.success === false) {
        setSendError(data.message);
        return;
      }
      stickToBottom.current = true;
      setMessages((prev) => mergeMessages(prev, [data]));
      setBody('');
      onActivityRef.current?.();
    } catch {
      setSendError('Could not send your message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) send(e);
  };

  if (loading) return <p className='m-auto text-slate-500'>Loading...</p>;
  if (error) return <p className='m-auto text-red-700'>Conversation not found.</p>;

  const { otherUser, listing } = conversation;

  return (
    <div className='flex flex-col w-full h-[70vh]'>
      <header className='flex items-center gap-3 border-b p-3'>
        <Link to='/messages' className='md:hidden text-slate-600' aria-label='Back to conversations'>
          ←
        </Link>
        <div className='min-w-0'>
          <p className='font-semibold text-slate-700 truncate'>{otherUser?.username ?? 'Deleted user'}</p>
          {listing ? (
            <Link to={`/listing/${listing._id}`} className='text-xs text-blue-800 hover:underline truncate block'>
              {listing.name}
            </Link>
          ) : (
            <p className='text-xs text-slate-500'>Listing removed</p>
          )}
        </div>
      </header>

      <div ref={scrollRef} onScroll={handleScroll} className='flex-1 overflow-y-auto p-3 flex flex-col gap-2'>
        {hasMore && (
          <button
            type='button'
            onClick={loadOlder}
            disabled={loadingOlder}
            className='self-center text-sm text-blue-800 hover:underline disabled:opacity-60'
          >
            {loadingOlder ? 'Loading...' : 'Load older messages'}
          </button>
        )}
        {messages.map((m) => {
          const mine = m.sender === currentUser?._id;
          return (
            <div key={m._id} className={`max-w-[75%] ${mine ? 'self-end' : 'self-start'}`}>
              <p
                className={`whitespace-pre-wrap break-words rounded-2xl px-3 py-2 ${
                  mine ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-800'
                }`}
              >
                {m.body}
              </p>
              <p className={`text-[10px] text-slate-500 mt-0.5 ${mine ? 'text-right' : ''}`}>
                {formatTimeOfDay(m.createdAt)}
              </p>
            </div>
          );
        })}
      </div>

      <form onSubmit={send} className='border-t p-3 flex gap-2 items-end'>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
          maxLength={2000}
          placeholder='Write a message...'
          aria-label='Message'
          className='flex-1 border rounded-lg p-2 resize-none'
        />
        <button
          type='submit'
          disabled={sending || !body.trim()}
          className='bg-slate-700 text-white px-4 py-2 rounded-lg uppercase disabled:opacity-60'
        >
          {sending ? 'Sending...' : 'Send'}
        </button>
      </form>
      {sendError && <p className='px-3 pb-2 text-sm text-red-700'>{sendError}</p>}
    </div>
  );
}
