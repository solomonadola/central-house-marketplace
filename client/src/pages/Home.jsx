import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaArrowRight, FaCalendarCheck, FaComments, FaSearch } from 'react-icons/fa';
import ListingGrid from '../components/ListingGrid';
import { apiFetch } from '../utils/apiFetch';

const HERO_IMAGE = 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=2000&q=80';

const SECTIONS = [
  ['offers', 'Special offers', 'Homes with a reduced price right now.', 'offer=true', '/search?offer=true'],
  ['rent', 'Homes for rent', 'The newest places to rent.', 'type=rent', '/search?type=rent'],
  ['sale', 'Homes for sale', 'The newest places on the market.', 'type=sale', '/search?type=sale'],
];

const STEPS = [
  [FaSearch, 'Find a place', 'Filter by price, bedrooms and amenities, or browse homes on the map.'],
  [FaComments, 'Talk to the owner', 'Message owners directly. Your email address stays private.'],
  [FaCalendarCheck, 'Book a viewing', 'Pick a time to visit, and the owner confirms it in your inbox.'],
];

function HeroSearch() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [type, setType] = useState('all');

  const submit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams({ searchTerm: searchTerm.trim(), type });
    navigate(`/search?${params}`);
  };

  return (
    <form
      onSubmit={submit}
      role='search'
      className='mt-8 flex w-full max-w-2xl flex-col gap-2 rounded-2xl bg-white p-2 shadow-xl sm:flex-row'
    >
      <select
        value={type}
        onChange={(e) => setType(e.target.value)}
        aria-label='Rent or buy'
        className='rounded-xl border-0 bg-slate-100 px-3 py-3 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-brand-500'
      >
        <option value='all'>Rent or buy</option>
        <option value='rent'>Rent</option>
        <option value='sale'>Buy</option>
      </select>
      <input
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder='Try "loft", "garden" or "villa"'
        aria-label='What are you looking for?'
        className='min-w-0 flex-1 rounded-xl border-0 px-3 py-3 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-500'
      />
      <button className='btn-primary rounded-xl px-6 py-3 text-base'>
        <FaSearch aria-hidden='true' /> Search
      </button>
    </form>
  );
}

function ListingSection({ id, title, subtitle, query, href }) {
  const [listings, setListings] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiFetch(`/api/listing/get?${query}&limit=4`);
        const data = await res.json();
        setListings(Array.isArray(data) ? data : []);
      } catch (error) {
        console.log(error);
        setListings([]);
      }
    };
    load();
  }, [query]);

  // Nothing to show: leave the section out instead of showing it empty.
  if (listings && listings.length === 0) return null;

  return (
    <section aria-labelledby={`${id}-title`} className='container-page mt-14'>
      <div className='mb-5 flex items-end justify-between gap-4'>
        <div>
          <h2 id={`${id}-title`} className='text-2xl font-bold tracking-tight text-slate-900'>
            {title}
          </h2>
          <p className='mt-1 text-slate-600'>{subtitle}</p>
        </div>
        <Link to={href} className='flex shrink-0 items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-800'>
          View all <FaArrowRight className='h-3 w-3' aria-hidden='true' />
        </Link>
      </div>
      <ListingGrid listings={listings ?? []} loading={!listings} skeletons={4} columns='lg:grid-cols-4' />
    </section>
  );
}

export default function Home() {
  return (
    <div>
      <section className='relative isolate overflow-hidden'>
        <img src={HERO_IMAGE} alt='' className='absolute inset-0 -z-10 h-full w-full object-cover' />
        <div className='absolute inset-0 -z-10 bg-gradient-to-r from-slate-950/90 via-slate-950/70 to-slate-900/30' />
        <div className='container-page flex flex-col items-start py-20 sm:py-28 lg:py-32'>
          <p className='badge bg-white/15 text-white ring-1 ring-white/30 backdrop-blur'>Homes to rent and buy</p>
          <h1 className='mt-4 max-w-2xl text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl'>
            Find your next place, <span className='text-brand-300'>without the hassle</span>
          </h1>
          <p className='mt-4 max-w-xl text-lg text-slate-200'>
            Browse homes, talk to owners directly and book viewings, all in one place.
          </p>
          <HeroSearch />
          <div className='mt-4 flex flex-wrap gap-2 text-sm'>
            {[
              ['Rentals', '/search?type=rent'],
              ['For sale', '/search?type=sale'],
              ['Special offers', '/search?offer=true'],
              ['Furnished', '/search?furnished=true'],
            ].map(([label, to]) => (
              <Link
                key={to}
                to={to}
                className='rounded-full bg-white/10 px-3 py-1.5 font-medium text-white ring-1 ring-white/25 backdrop-blur hover:bg-white/20'
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {SECTIONS.map(([id, title, subtitle, query, href]) => (
        <ListingSection key={id} id={id} title={title} subtitle={subtitle} query={query} href={href} />
      ))}

      <section aria-labelledby='how-title' className='container-page mt-20'>
        <h2 id='how-title' className='text-center text-2xl font-bold tracking-tight text-slate-900'>
          How it works
        </h2>
        <ol className='mt-8 grid gap-6 sm:grid-cols-3'>
          {STEPS.map(([Icon, title, text], i) => (
            <li key={title} className='card p-6'>
              <span className='flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700'>
                <Icon className='h-5 w-5' aria-hidden='true' />
              </span>
              <h3 className='mt-4 font-semibold text-slate-900'>
                {i + 1}. {title}
              </h3>
              <p className='mt-1 text-sm text-slate-600'>{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className='container-page mt-20'>
        <div className='flex flex-col items-start gap-4 rounded-2xl bg-brand-700 px-6 py-10 text-white sm:flex-row sm:items-center sm:justify-between sm:px-10'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>Have a place to rent or sell?</h2>
            <p className='mt-1 text-brand-100'>List it for free and hear from interested people directly.</p>
          </div>
          <Link to='/create-listing' className='btn shrink-0 bg-white px-5 py-3 text-brand-700 hover:bg-brand-50'>
            Post a listing
          </Link>
        </div>
      </section>
    </div>
  );
}
