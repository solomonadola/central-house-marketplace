import { Link, useLocation } from 'react-router-dom';
import { FaHome, FaSearch } from 'react-icons/fa';

// Shown for any URL that doesn't match a page.
export default function NotFound() {
  const { pathname } = useLocation();

  return (
    <main className='container-page flex flex-col items-center py-20 text-center'>
      <p className='text-6xl font-extrabold text-brand-600'>404</p>
      <h1 className='page-title mt-4'>Page not found</h1>
      <p className='mt-2 max-w-md text-slate-600'>
        We couldn&apos;t find <span className='break-all font-mono text-sm text-slate-800'>{pathname}</span>. The
        link may be broken, or the page may have moved.
      </p>
      <div className='mt-8 flex flex-wrap justify-center gap-3'>
        <Link to='/' className='btn-primary'>
          <FaHome aria-hidden='true' /> Go home
        </Link>
        <Link to='/search' className='btn-secondary'>
          <FaSearch aria-hidden='true' /> Browse homes
        </Link>
      </div>
    </main>
  );
}
