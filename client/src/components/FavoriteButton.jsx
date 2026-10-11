import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { FaHeart, FaRegHeart } from 'react-icons/fa';
import { setFavorites } from '../redux/user/userSlice';
import { apiFetch } from '../utils/apiFetch';

export default function FavoriteButton({ listingId, className = '' }) {
  const { currentUser } = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  // Users persisted before favorites existed have no favorites field.
  const favorites = currentUser?.favorites ?? [];
  const isFavorite = favorites.includes(listingId);

  const handleClick = async (e) => {
    // The button sits inside listing card links.
    e.preventDefault();
    e.stopPropagation();

    if (!currentUser) {
      navigate('/sign-in');
      return;
    }
    if (saving) return;

    // Update the UI right away and roll back if the request fails.
    const previous = favorites;
    dispatch(
      setFavorites(
        isFavorite ? favorites.filter((id) => id !== listingId) : [...favorites, listingId]
      )
    );
    setSaving(true);
    try {
      const res = await apiFetch(`/api/user/favorites/${listingId}`, {
        method: isFavorite ? 'DELETE' : 'PUT',
      });
      const data = await res.json();
      if (data.success === false) {
        // An expired session already signed the user out in apiFetch.
        if (data.code !== 'AUTH_REQUIRED') dispatch(setFavorites(previous));
        return;
      }
      dispatch(setFavorites(data.favorites));
    } catch {
      dispatch(setFavorites(previous));
    } finally {
      setSaving(false);
    }
  };

  const label = isFavorite ? 'Remove from saved' : 'Save listing';

  return (
    <button
      type='button'
      onClick={handleClick}
      aria-label={label}
      aria-pressed={isFavorite}
      title={label}
      className={`flex items-center justify-center rounded-full bg-white/90 shadow w-10 h-10 hover:scale-110 transition-transform ${className}`}
    >
      {isFavorite ? (
        <FaHeart className='text-red-600 text-lg' />
      ) : (
        <FaRegHeart className='text-slate-600 text-lg' />
      )}
    </button>
  );
}
