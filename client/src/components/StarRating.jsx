import { FaRegStar, FaStar, FaStarHalfAlt } from 'react-icons/fa';

// Read-only stars rounded to the nearest half star.
export default function StarRating({ value, className = 'text-amber-500' }) {
  const rounded = Math.round(value * 2) / 2;
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`} role='img' aria-label={`Rated ${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((star) => {
        if (rounded >= star) return <FaStar key={star} aria-hidden='true' />;
        if (rounded >= star - 0.5) return <FaStarHalfAlt key={star} aria-hidden='true' />;
        return <FaRegStar key={star} aria-hidden='true' />;
      })}
    </span>
  );
}

// Lets the user pick 1-5 stars.
export function StarInput({ value, onChange, disabled = false }) {
  return (
    <div className='inline-flex gap-1 text-2xl text-amber-500' role='radiogroup' aria-label='Rating'>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type='button'
          role='radio'
          aria-checked={value === star}
          aria-label={`${star} star${star > 1 ? 's' : ''}`}
          disabled={disabled}
          onClick={() => onChange(star)}
          className='hover:scale-110 transition-transform disabled:opacity-60'
        >
          {value >= star ? <FaStar aria-hidden='true' /> : <FaRegStar aria-hidden='true' />}
        </button>
      ))}
    </div>
  );
}
