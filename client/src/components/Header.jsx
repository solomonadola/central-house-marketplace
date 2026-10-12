import { FaCalendarAlt, FaEnvelope, FaFileAlt, FaHeart, FaPlus, FaSearch } from 'react-icons/fa';
import Logo from './Logo';
import NotificationBell from './NotificationBell';
import { useUnreadCountPolling } from '../hooks/useUnreadCount';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useEffect, useState } from 'react';
import { useTranslation } from '../i18n/context';

export default function Header() {
  const { t } = useTranslation();
  const { currentUser } = useSelector((state) => state.user);
  const unreadCount = useSelector((state) => state.inbox.unreadCount);
  useUnreadCountPolling();
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const handleSubmit = (e) => {
    e.preventDefault();
    const urlParams = new URLSearchParams(location.search);
    urlParams.set('searchTerm', searchTerm);
    const searchQuery = urlParams.toString();
    navigate(`/search?${searchQuery}`);
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const searchTermFromUrl = urlParams.get('searchTerm');
    if (searchTermFromUrl) {
      setSearchTerm(searchTermFromUrl);
    }
  }, [location.search]);
  const iconLink = 'relative flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900';
  const countBadge =
    'absolute right-0.5 top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white';

  return (
    <header className='sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur print:hidden'>
      <div className='container-page flex flex-wrap items-center gap-x-3 gap-y-2 py-3'>
        <Link to='/' aria-label='Central House Marketplace home'>
          <Logo />
        </Link>
        {/* Full width on its own row on phones, inline from sm up. */}
        <form
          onSubmit={handleSubmit}
          role='search'
          className='order-last w-full sm:order-none sm:ml-4 sm:w-auto sm:max-w-md sm:flex-1'
        >
          <div className='relative'>
            <input
              type='text'
              placeholder='Search homes by name...'
              aria-label='Search listings'
              className='input rounded-full bg-slate-50 pl-4 pr-11'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button
              aria-label='Search'
              className='absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-brand-600 text-white hover:bg-brand-700'
            >
              <FaSearch className='h-3.5 w-3.5' />
            </button>
          </div>
        </form>
        <nav className='ml-auto flex items-center gap-1' aria-label='Main'>
          <NavLink to='/search' className='btn-ghost hidden md:inline-flex'>
            {t('nav.browse')}
          </NavLink>
          <NavLink to='/insights' className='btn-ghost hidden md:inline-flex'>
            {t('nav.insights')}
          </NavLink>
          <NavLink to='/about' className='btn-ghost hidden md:inline-flex'>
            {t('nav.about')}
          </NavLink>
          {currentUser?.role === 'admin' && (
            <NavLink to='/admin' className='btn-ghost'>
              Admin
            </NavLink>
          )}
          {currentUser ? (
            <>
              <NotificationBell />
              <Link
                to='/messages'
                aria-label={unreadCount > 0 ? `Messages, ${unreadCount} unread` : 'Messages'}
                title='Messages'
                className={iconLink}
              >
                <FaEnvelope className='h-5 w-5' />
                {unreadCount > 0 && <span className={countBadge}>{unreadCount > 9 ? '9+' : unreadCount}</span>}
              </Link>
              <Link to='/viewings' aria-label='Viewings' title='Viewings' className={iconLink}>
                <FaCalendarAlt className='h-5 w-5' />
              </Link>
              <Link to='/applications' aria-label='Applications' title='Applications' className={iconLink}>
                <FaFileAlt className='h-5 w-5' />
              </Link>
              <Link to='/saved' aria-label='Saved listings' title='Saved listings' className={iconLink}>
                <FaHeart className='h-5 w-5' />
                {currentUser.favorites?.length > 0 && <span className={countBadge}>{currentUser.favorites.length}</span>}
              </Link>
              <Link to='/create-listing' className='btn-primary ml-1 hidden lg:inline-flex'>
                <FaPlus className='h-3 w-3' /> Post a listing
              </Link>
              <Link to='/profile' className='ml-1 shrink-0' title='Your profile'>
                <img
                  className='h-9 w-9 rounded-full object-cover ring-2 ring-white ring-offset-1 ring-offset-slate-200'
                  src={currentUser.avatar}
                  alt='profile'
                />
              </Link>
            </>
          ) : (
            <>
              <Link to='/sign-in' className='btn-ghost'>
                {t('nav.signIn')}
              </Link>
              <Link to='/sign-up' className='btn-primary hidden sm:inline-flex'>
                {t('nav.signUp')}
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
