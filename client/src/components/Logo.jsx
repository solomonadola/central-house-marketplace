// The house mark from the favicon, plus the wordmark.
export default function Logo({ className = '' }) {
  return (
    <span className={`flex items-center gap-2 ${className}`}>
      <svg viewBox='0 0 32 32' className='h-8 w-8 shrink-0' aria-hidden='true'>
        <rect width='32' height='32' rx='8' fill='#2a78d6' />
        <path d='M16 7 6 15h3v10h5v-6h4v6h5V15h3z' fill='#fff' />
      </svg>
      <span className='text-base font-bold leading-tight tracking-tight text-slate-900 sm:text-lg'>
        Central<span className='text-brand-600'>House</span>
      </span>
    </span>
  );
}
