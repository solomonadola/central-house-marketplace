import { FaCheckCircle } from 'react-icons/fa';

const SIDE_IMAGE = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80';

const BENEFITS = [
  'Save homes and get back to them anytime',
  'Message owners without sharing your email',
  'Book viewings at a time that suits you',
];

// Two-column page for sign-in and account flows: a photo panel with the
// pitch on wide screens, and the form.
export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className='container-page grid gap-10 py-10 lg:grid-cols-2 lg:items-center lg:py-16'>
      <div className='relative hidden overflow-hidden rounded-2xl lg:block'>
        <img src={SIDE_IMAGE} alt='' className='h-[560px] w-full object-cover' />
        <div className='absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/55 to-transparent' />
        <div className='absolute inset-x-0 bottom-0 p-8 text-white'>
          <p className='text-2xl font-bold'>Your next home is a few clicks away.</p>
          <ul className='mt-4 space-y-2 text-sm text-slate-200'>
            {BENEFITS.map((text) => (
              <li key={text} className='flex items-center gap-2'>
                <FaCheckCircle className='shrink-0 text-brand-300' aria-hidden='true' />
                {text}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className='mx-auto w-full max-w-md'>
        <h1 className='page-title'>{title}</h1>
        {subtitle && <p className='mt-2 text-slate-600'>{subtitle}</p>}
        <div className='mt-8'>{children}</div>
      </div>
    </div>
  );
}

// "or" separator between the form and alternative sign-in options.
export function Divider({ label = 'or' }) {
  return (
    <div className='flex items-center gap-3 text-xs uppercase tracking-wide text-slate-400'>
      <span className='h-px flex-1 bg-slate-200' />
      {label}
      <span className='h-px flex-1 bg-slate-200' />
    </div>
  );
}
