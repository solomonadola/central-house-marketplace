import { Link } from 'react-router-dom';
import Logo from './Logo';

const columns = [
  [
    'Explore',
    [
      ['Homes for rent', '/search?type=rent'],
      ['Homes for sale', '/search?type=sale'],
      ['Special offers', '/search?offer=true'],
    ],
  ],
  [
    'Your account',
    [
      ['Post a listing', '/create-listing'],
      ['Saved homes', '/saved'],
      ['Messages', '/messages'],
    ],
  ],
  ['Company', [['About us', '/about']]],
];

export default function Footer() {
  return (
    <footer className='mt-16 border-t border-slate-200 bg-white'>
      <div className='container-page grid grid-cols-2 gap-8 py-10 lg:grid-cols-5'>
        <div className='col-span-2'>
          <Logo />
          <p className='mt-3 max-w-xs text-sm text-slate-600'>
            Find a place to rent or buy, talk to owners directly, and book viewings in one place.
          </p>
        </div>
        {columns.map(([title, links]) => (
          <nav key={title} aria-label={title}>
            <h2 className='text-sm font-semibold text-slate-900'>{title}</h2>
            <ul className='mt-3 space-y-2'>
              {links.map(([label, to]) => (
                <li key={to}>
                  <Link to={to} className='text-sm text-slate-600 hover:text-brand-700'>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className='border-t border-slate-100'>
        <p className='container-page py-4 text-xs text-slate-500'>
          © {new Date().getFullYear()} Central House Marketplace
        </p>
      </div>
    </footer>
  );
}
