import { FaEnvelope, FaHeart, FaSearch } from 'react-icons/fa';
import { useUnreadCountPolling } from '../hooks/useUnreadCount';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useEffect, useState } from 'react';

export default function Header() {
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
  return (
    <header className='bg-slate-200 shadow-md'>
      <div className='flex justify-between items-center max-w-6xl mx-auto p-3'>
        <Link to='/'>
          <h1 className='font-bold text-sm sm:text-xl flex flex-wrap'>
            <span className='text-slate-500'>Central</span>
            <span className='text-slate-700'>HouseMarketplace</span>
          </h1>
        </Link>
        <form
          onSubmit={handleSubmit}
          className='bg-slate-100 p-3 rounded-lg flex items-center'
        >
          <input
            type='text'
            placeholder='Search...'
            className='bg-transparent focus:outline-none w-24 sm:w-64'
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button>
            <FaSearch className='text-slate-600' />
          </button>
        </form>
        <ul className='flex gap-4'>
          <Link to='/'>
            <li className='hidden sm:inline text-slate-700 hover:underline'>
              Home
            </li>
          </Link>
          <Link to='/about'>
            <li className='hidden sm:inline text-slate-700 hover:underline'>
              About
            </li>
          </Link>
          {currentUser && (
            <Link
              to='/messages'
              aria-label={unreadCount > 0 ? `Messages, ${unreadCount} unread` : 'Messages'}
              className='relative flex items-center'
            >
              <FaEnvelope className='text-slate-700 h-5 w-5' />
              {unreadCount > 0 && (
                <span className='absolute -top-2 -right-3 rounded-full bg-red-600 text-white text-[10px] font-semibold min-w-[18px] h-[18px] px-1 flex items-center justify-center'>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
          )}
          {currentUser && (
            <Link to='/saved' aria-label='Saved listings' className='relative flex items-center'>
              <FaHeart className='text-slate-700 h-5 w-5' />
              {currentUser.favorites?.length > 0 && (
                <span className='absolute -top-2 -right-3 rounded-full bg-red-600 text-white text-[10px] font-semibold min-w-[18px] h-[18px] px-1 flex items-center justify-center'>
                  {currentUser.favorites.length}
                </span>
              )}
            </Link>
          )}
          <Link to='/profile'>
            {currentUser ? (
              <img
                className='rounded-full h-7 w-7 object-cover'
                src={currentUser.avatar}
                alt='profile'
              />
            ) : (
              <li className=' text-slate-700 hover:underline'> Sign in</li>
            )}
          </Link>
        </ul>
      </div>
    </header>
  );
}
