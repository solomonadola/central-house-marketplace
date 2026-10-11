import { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { FaRegThumbsUp, FaReply } from 'react-icons/fa';
import StarRating, { StarInput } from './StarRating';
import { apiFetch } from '../utils/apiFetch';
import { formatShortTime } from '../utils/formatTime';

function ReviewForm({ listingId, ownReview, onSaved }) {
  const [rating, setRating] = useState(ownReview?.rating ?? 0);
  const [comment, setComment] = useState(ownReview?.comment ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const save = async (e) => {
    e.preventDefault();
    if (!rating) {
      setError('Please choose a rating.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/reviews/listing/${listingId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment }),
      });
      const data = await res.json();
      if (data.success === false) {
        setError(data.message);
        return;
      }
      onSaved();
    } catch {
      setError('Could not save your review. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className='card flex flex-col gap-3 p-4'>
      <p className='font-semibold text-slate-700'>{ownReview ? 'Edit your review' : 'Write a review'}</p>
      <StarInput value={rating} onChange={setRating} disabled={saving} />
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={1000}
        rows={3}
        placeholder='How was your experience with this listing and its owner? (optional)'
        aria-label='Review'
        className='input'
      />
      {error && <p className='text-sm text-red-700'>{error}</p>}
      <button
        type='submit'
        disabled={saving}
        className='btn-primary self-start'
      >
        {saving ? 'Saving...' : ownReview ? 'Update review' : 'Post review'}
      </button>
    </form>
  );
}

function ReviewItem({ review, canVote, isOwner, onChanged }) {
  const [helpfulCount, setHelpfulCount] = useState(review.helpfulCount ?? 0);
  const [voted, setVoted] = useState(Boolean(review.votedHelpful));
  const [replying, setReplying] = useState(false);
  const [reply, setReply] = useState(review.ownerReply ?? '');
  const [busy, setBusy] = useState(false);

  const vote = async () => {
    setBusy(true);
    try {
      const res = await apiFetch(`/api/reviews/${review._id}/helpful`, { method: 'POST' });
      const data = await res.json();
      if (data.success === false) return;
      setHelpfulCount(data.helpfulCount);
      setVoted(data.voted);
    } finally {
      setBusy(false);
    }
  };

  const saveReply = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await apiFetch(`/api/reviews/${review._id}/reply`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: reply }),
      });
      const data = await res.json();
      if (data.success === false) return;
      setReplying(false);
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className='border-b pb-3'>
      <div className='flex items-center gap-2'>
        <span className='font-semibold text-slate-700'>{review.author?.username ?? 'Deleted user'}</span>
        <StarRating value={review.rating} className='text-amber-500 text-sm' />
        <span className='text-xs text-slate-500'>{formatShortTime(review.createdAt)}</span>
      </div>
      {review.comment && <p className='text-slate-700 mt-1 whitespace-pre-wrap'>{review.comment}</p>}

      <div className='mt-2 flex items-center gap-3 text-xs'>
        {canVote ? (
          <button
            type='button'
            onClick={vote}
            disabled={busy}
            aria-pressed={voted}
            className={`flex items-center gap-1 hover:underline ${voted ? 'font-semibold text-brand-700' : 'text-slate-500'}`}
          >
            <FaRegThumbsUp aria-hidden='true' /> Helpful{helpfulCount > 0 ? ` (${helpfulCount})` : ''}
          </button>
        ) : (
          helpfulCount > 0 && <span className='text-slate-500'>Helpful ({helpfulCount})</span>
        )}
        {isOwner && !review.ownerReply && (
          <button type='button' onClick={() => setReplying((v) => !v)} className='flex items-center gap-1 text-slate-500 hover:underline'>
            <FaReply aria-hidden='true' /> Reply
          </button>
        )}
      </div>

      {review.ownerReply && (
        <p className='mt-2 rounded-lg bg-slate-50 p-2 text-sm text-slate-600'>
          <span className='font-semibold text-slate-700'>Owner reply:</span> {review.ownerReply}
        </p>
      )}

      {replying && (
        <form onSubmit={saveReply} className='mt-2 flex flex-col gap-2'>
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            maxLength={1000}
            rows={2}
            aria-label='Reply to review'
            className='input'
            placeholder='Thank the reviewer or clarify something'
          />
          <div className='flex gap-2'>
            <button type='submit' disabled={busy} className='btn-primary text-sm'>
              Post reply
            </button>
            <button type='button' onClick={() => setReplying(false)} className='btn-ghost text-sm'>
              Cancel
            </button>
          </div>
        </form>
      )}
    </li>
  );
}

export default function ListingReviews({ listingId }) {
  const { currentUser } = useSelector((state) => state.user);
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [sort, setSort] = useState('recent');

  const load = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/reviews/listing/${listingId}?sort=${sort}`);
      const json = await res.json();
      if (json.success === false) throw new Error(json.message);
      setData(json);
      setError(false);
    } catch {
      setError(true);
    }
  }, [listingId, sort]);

  // Reload when the user signs in or out, since the viewer info changes.
  useEffect(() => {
    load();
  }, [load, currentUser?._id]);

  const deleteOwn = async () => {
    await apiFetch(`/api/reviews/${data.viewer.ownReview._id}`, { method: 'DELETE' });
    load();
  };

  if (error) return <p className='text-sm text-red-700'>Could not load reviews.</p>;
  if (!data) return null;

  const { average, count, reviews, viewer } = data;

  return (
    <section className='mt-4 flex flex-col gap-3'>
      <div className='flex items-center gap-2'>
        <h2 className='text-xl font-semibold text-slate-900'>Reviews</h2>
        {count > 0 && (
          <span className='flex items-center gap-1 text-slate-600'>
            <StarRating value={average} />
            {average.toFixed(1)} ({count} {count === 1 ? 'review' : 'reviews'})
          </span>
        )}
      </div>

      {count > 1 && (
        <label className='flex items-center gap-2 text-sm text-slate-600'>
          Sort by
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            aria-label='Sort reviews'
            className='rounded-lg border border-slate-300 p-1.5'
          >
            <option value='recent'>Most recent</option>
            <option value='helpful'>Most helpful</option>
            <option value='rating_high'>Highest rating</option>
            <option value='rating_low'>Lowest rating</option>
          </select>
        </label>
      )}

      {viewer?.canReview && (
        <>
          <ReviewForm key={viewer.ownReview?._id ?? 'new'} listingId={listingId} ownReview={viewer.ownReview} onSaved={load} />
          {viewer.ownReview && (
            <button type='button' onClick={deleteOwn} className='self-start text-sm text-red-700 hover:underline'>
              Delete your review
            </button>
          )}
        </>
      )}
      {currentUser && viewer && !viewer.canReview && !viewer.isOwner && (
        <p className='text-sm text-slate-500'>You can review this listing after contacting its owner.</p>
      )}

      {count === 0 && <p className='text-slate-600'>No reviews yet.</p>}
      <ul className='flex flex-col gap-3'>
        {reviews.map((r) => (
          <ReviewItem
            key={r._id}
            review={r}
            canVote={Boolean(currentUser) && currentUser._id !== r.author?._id}
            isOwner={Boolean(viewer?.isOwner)}
            onChanged={load}
          />
        ))}
      </ul>
    </section>
  );
}
