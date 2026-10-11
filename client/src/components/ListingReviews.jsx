import { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
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
    <form onSubmit={save} className='flex flex-col gap-2 border rounded-lg p-3'>
      <p className='font-semibold text-slate-700'>{ownReview ? 'Edit your review' : 'Write a review'}</p>
      <StarInput value={rating} onChange={setRating} disabled={saving} />
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={1000}
        rows={3}
        placeholder='How was your experience with this listing and its owner? (optional)'
        aria-label='Review'
        className='border rounded-lg p-2'
      />
      {error && <p className='text-sm text-red-700'>{error}</p>}
      <button
        type='submit'
        disabled={saving}
        className='self-start bg-slate-700 text-white px-4 py-2 rounded-lg uppercase disabled:opacity-60'
      >
        {saving ? 'Saving...' : ownReview ? 'Update review' : 'Post review'}
      </button>
    </form>
  );
}

export default function ListingReviews({ listingId }) {
  const { currentUser } = useSelector((state) => state.user);
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/reviews/listing/${listingId}`);
      const json = await res.json();
      if (json.success === false) throw new Error(json.message);
      setData(json);
      setError(false);
    } catch {
      setError(true);
    }
  }, [listingId]);

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
        <h2 className='text-xl font-semibold text-slate-700'>Reviews</h2>
        {count > 0 && (
          <span className='flex items-center gap-1 text-slate-600'>
            <StarRating value={average} />
            {average.toFixed(1)} ({count} {count === 1 ? 'review' : 'reviews'})
          </span>
        )}
      </div>

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
          <li key={r._id} className='border-b pb-3'>
            <div className='flex items-center gap-2'>
              <span className='font-semibold text-slate-700'>{r.author?.username ?? 'Deleted user'}</span>
              <StarRating value={r.rating} className='text-amber-500 text-sm' />
              <span className='text-xs text-slate-500'>{formatShortTime(r.createdAt)}</span>
            </div>
            {r.comment && <p className='text-slate-700 mt-1 whitespace-pre-wrap'>{r.comment}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}
