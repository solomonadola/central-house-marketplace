import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import ListingGrid from '../components/ListingGrid';
import { FaBell, FaMapMarkedAlt, FaSearch, FaSlidersH, FaThList } from 'react-icons/fa';
import ListingsMap from '../components/ListingsMap';
import { apiFetch } from '../utils/apiFetch';
import { AMENITY_OPTIONS, PROPERTY_TYPE_OPTIONS } from '../utils/listingDetails';

const VIEW_KEY = 'searchView';

const readView = () => {
  try {
    return localStorage.getItem(VIEW_KEY) === 'map' ? 'map' : 'list';
  } catch {
    return 'list';
  }
};

export default function Search() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useSelector((state) => state.user);
  const [sidebardata, setSidebardata] = useState({
    searchTerm: '',
    type: 'all',
    parking: false,
    furnished: false,
    offer: false,
    sort: 'createdAt',
    order: 'desc',
    minPrice: '',
    maxPrice: '',
    minBedrooms: '',
    minBathrooms: '',
    propertyType: 'any',
    amenities: [],
  });

  const [loading, setLoading] = useState(false);
  const [listings, setListings] = useState([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [view, setView] = useState(readView);
  const [showFilters, setShowFilters] = useState(false);
  const [saveState, setSaveState] = useState(null);

  const saveSearch = async () => {
    setSaveState('saving');
    try {
      const res = await apiFetch('/api/saved-searches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sidebardata),
      });
      const data = await res.json();
      setSaveState(data.success === false ? 'error' : 'saved');
    } catch {
      setSaveState('error');
    }
  };

  const changeView = (next) => {
    setView(next);
    try {
      localStorage.setItem(VIEW_KEY, next);
    } catch {
      // Not remembering the choice is fine.
    }
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const searchTermFromUrl = urlParams.get('searchTerm');
    const typeFromUrl = urlParams.get('type');
    const parkingFromUrl = urlParams.get('parking');
    const furnishedFromUrl = urlParams.get('furnished');
    const offerFromUrl = urlParams.get('offer');
    const sortFromUrl = urlParams.get('sort');
    const orderFromUrl = urlParams.get('order');

    setSidebardata({
      searchTerm: searchTermFromUrl || '',
      type: typeFromUrl || 'all',
      parking: parkingFromUrl === 'true',
      furnished: furnishedFromUrl === 'true',
      offer: offerFromUrl === 'true',
      sort: sortFromUrl || 'createdAt',
      order: orderFromUrl || 'desc',
      minPrice: urlParams.get('minPrice') || '',
      maxPrice: urlParams.get('maxPrice') || '',
      minBedrooms: urlParams.get('minBedrooms') || '',
      minBathrooms: urlParams.get('minBathrooms') || '',
      propertyType: urlParams.get('propertyType') || 'any',
      amenities: urlParams.get('amenities') ? urlParams.get('amenities').split(',') : [],
    });

    const fetchListings = async () => {
      setLoading(true);
      setError(false);
      try {
        const searchQuery = urlParams.toString();
        const res = await apiFetch(`/api/listing/get?${searchQuery}`);
        const data = await res.json();
        if (!Array.isArray(data)) throw new Error(data.message);
        setListings(data);
        setTotal(Number(res.headers.get('X-Total-Count')) || data.length);
      } catch {
        setListings([]);
        setTotal(0);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchListings();
  }, [location.search]);

  const handleChange = (e) => {
    if (
      e.target.id === 'all' ||
      e.target.id === 'rent' ||
      e.target.id === 'sale'
    ) {
      setSidebardata({ ...sidebardata, type: e.target.id });
    }

    if (e.target.id === 'searchTerm') {
      setSidebardata({ ...sidebardata, searchTerm: e.target.value });
    }

    if (
      e.target.id === 'parking' ||
      e.target.id === 'furnished' ||
      e.target.id === 'offer'
    ) {
      setSidebardata({
        ...sidebardata,
        [e.target.id]:
          e.target.checked || e.target.checked === 'true' ? true : false,
      });
    }

    if (
      e.target.id === 'minPrice' ||
      e.target.id === 'maxPrice' ||
      e.target.id === 'minBedrooms' ||
      e.target.id === 'minBathrooms'
    ) {
      setSidebardata({ ...sidebardata, [e.target.id]: e.target.value });
    }

    if (e.target.id === 'sort_order') {
      const sort = e.target.value.split('_')[0] || 'createdAt';

      const order = e.target.value.split('_')[1] || 'desc';

      setSidebardata({ ...sidebardata, sort, order });
    }

    if (e.target.id === 'propertyType') {
      setSidebardata({ ...sidebardata, propertyType: e.target.value });
    }

    if (e.target.name === 'amenities') {
      const { value, checked } = e.target;
      const amenities = checked
        ? [...sidebardata.amenities, value]
        : sidebardata.amenities.filter((a) => a !== value);
      setSidebardata({ ...sidebardata, amenities });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const urlParams = new URLSearchParams();
    urlParams.set('searchTerm', sidebardata.searchTerm);
    urlParams.set('type', sidebardata.type);
    urlParams.set('parking', sidebardata.parking);
    urlParams.set('furnished', sidebardata.furnished);
    urlParams.set('offer', sidebardata.offer);
    urlParams.set('sort', sidebardata.sort);
    urlParams.set('order', sidebardata.order);
    // Only include range filters that are set, to keep URLs short.
    for (const key of ['minPrice', 'maxPrice', 'minBedrooms', 'minBathrooms']) {
      if (sidebardata[key] !== '') urlParams.set(key, sidebardata[key]);
    }
    if (sidebardata.propertyType !== 'any') urlParams.set('propertyType', sidebardata.propertyType);
    if (sidebardata.amenities.length > 0) urlParams.set('amenities', sidebardata.amenities.join(','));
    const searchQuery = urlParams.toString();
    navigate(`/search?${searchQuery}`);
  };

  const onShowMoreClick = async () => {
    const urlParams = new URLSearchParams(location.search);
    urlParams.set('startIndex', listings.length);
    setLoadingMore(true);
    try {
      const res = await apiFetch(`/api/listing/get?${urlParams.toString()}`);
      const data = await res.json();
      if (Array.isArray(data)) setListings([...listings, ...data]);
    } finally {
      setLoadingMore(false);
    }
  };

  const showMore = !loading && listings.length < total;
  const typeOptions = [
    ['all', 'Any'],
    ['rent', 'Rent'],
    ['sale', 'Buy'],
  ];
  const toggles = [
    ['offer', 'Special offer'],
    ['parking', 'Parking'],
    ['furnished', 'Furnished'],
  ];

  return (
    <div className='container-page py-6 sm:py-8'>
      <div className='flex flex-col gap-6 md:flex-row md:items-start'>
        <aside className='md:sticky md:top-24 md:w-72 md:shrink-0'>
          <button
            type='button'
            onClick={() => setShowFilters((open) => !open)}
            aria-expanded={showFilters}
            className='btn-secondary w-full md:hidden'
          >
            <FaSlidersH aria-hidden='true' /> {showFilters ? 'Hide filters' : 'Filters'}
          </button>
          <form
            onSubmit={handleSubmit}
            className={`card mt-3 flex-col gap-6 p-5 md:mt-0 md:flex ${showFilters ? 'flex' : 'hidden'}`}
          >
            <div>
              <label htmlFor='searchTerm' className='label'>
                Keyword
              </label>
              <input
                type='text'
                id='searchTerm'
                placeholder='e.g. loft, garden, villa'
                className='input'
                value={sidebardata.searchTerm}
                onChange={handleChange}
              />
            </div>

            <fieldset>
              <legend className='label'>Looking to</legend>
              <div className='grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1'>
                {typeOptions.map(([value, label]) => (
                  <button
                    key={value}
                    type='button'
                    aria-pressed={sidebardata.type === value}
                    onClick={() => setSidebardata({ ...sidebardata, type: value })}
                    className={`rounded-md py-1.5 text-sm font-medium ${
                      sidebardata.type === value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className='label'>Price</legend>
              <div className='flex items-center gap-2'>
                <input
                  type='number'
                  id='minPrice'
                  min='0'
                  placeholder='Min'
                  aria-label='Minimum price'
                  className='input'
                  value={sidebardata.minPrice}
                  onChange={handleChange}
                />
                <span className='text-slate-400'>–</span>
                <input
                  type='number'
                  id='maxPrice'
                  min='0'
                  placeholder='Max'
                  aria-label='Maximum price'
                  className='input'
                  value={sidebardata.maxPrice}
                  onChange={handleChange}
                />
              </div>
            </fieldset>

            <div className='grid grid-cols-2 gap-3'>
              <div>
                <label htmlFor='minBedrooms' className='label'>
                  Bedrooms
                </label>
                <select id='minBedrooms' className='input' value={sidebardata.minBedrooms} onChange={handleChange}>
                  <option value=''>Any</option>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n}+
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor='minBathrooms' className='label'>
                  Bathrooms
                </label>
                <select id='minBathrooms' className='input' value={sidebardata.minBathrooms} onChange={handleChange}>
                  <option value=''>Any</option>
                  {[1, 2, 3, 4].map((n) => (
                    <option key={n} value={n}>
                      {n}+
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <fieldset>
              <legend className='label'>Must have</legend>
              <div className='flex flex-wrap gap-2'>
                {toggles.map(([id, label]) => (
                  <label
                    key={id}
                    className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm font-medium transition-colors focus-within:ring-2 focus-within:ring-brand-500 ${
                      sidebardata[id]
                        ? 'border-brand-600 bg-brand-50 text-brand-700'
                        : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400'
                    }`}
                  >
                    <input type='checkbox' id={id} className='sr-only' checked={sidebardata[id]} onChange={handleChange} />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>

            <div>
              <label htmlFor='propertyType' className='label'>
                Property type
              </label>
              <select id='propertyType' className='input' value={sidebardata.propertyType} onChange={handleChange}>
                <option value='any'>Any type</option>
                {PROPERTY_TYPE_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <fieldset>
              <legend className='label'>Amenities</legend>
              <div className='flex flex-wrap gap-2'>
                {AMENITY_OPTIONS.map(([value, label]) => (
                  <label
                    key={value}
                    className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                      sidebardata.amenities.includes(value)
                        ? 'border-brand-600 bg-brand-50 text-brand-700'
                        : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400'
                    }`}
                  >
                    <input
                      type='checkbox'
                      name='amenities'
                      value={value}
                      className='sr-only'
                      checked={sidebardata.amenities.includes(value)}
                      onChange={handleChange}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>

            <div>
              <label htmlFor='sort_order' className='label'>
                Sort by
              </label>
              <select
                onChange={handleChange}
                value={`${sidebardata.sort}_${sidebardata.order}`}
                id='sort_order'
                className='input'
              >
                <option value='createdAt_desc'>Latest</option>
                <option value='createdAt_asc'>Oldest</option>
                <option value='regularPrice_asc'>Price low to high</option>
                <option value='regularPrice_desc'>Price high to low</option>
              </select>
            </div>

            <button className='btn-primary w-full'>Apply filters</button>
          </form>
        </aside>

        <section className='min-w-0 flex-1' aria-labelledby='results-title'>
          <div className='mb-5 flex flex-wrap items-center justify-between gap-3'>
            <div>
              <h1 id='results-title' className='page-title'>
                {sidebardata.type === 'rent' ? 'Homes for rent' : sidebardata.type === 'sale' ? 'Homes for sale' : 'All homes'}
              </h1>
              {!loading && !error && total > 0 && (
                <p className='mt-1 text-sm text-slate-600'>
                  Showing {listings.length} of {total}
                </p>
              )}
            </div>
            <div className='flex items-center gap-2'>
              {currentUser && (
                <div className='flex items-center gap-2'>
                  <button
                    type='button'
                    onClick={saveSearch}
                    disabled={saveState === 'saving'}
                    className='btn-secondary text-sm'
                  >
                    <FaBell className='h-3.5 w-3.5' aria-hidden='true' />
                    {saveState === 'saving' ? 'Saving...' : saveState === 'saved' ? 'Search saved' : 'Save this search'}
                  </button>
                  {saveState === 'error' && <span className='text-xs text-red-700'>Could not save</span>}
                  {saveState === 'saved' && (
                    <Link to='/saved-searches' className='text-xs font-medium text-brand-700 hover:underline'>
                      Manage
                    </Link>
                  )}
                </div>
              )}
              <div className='flex rounded-lg bg-slate-100 p-1' role='group' aria-label='Results view'>
              {[
                ['list', 'List', FaThList],
                ['map', 'Map', FaMapMarkedAlt],
              ].map(([option, label, Icon]) => (
                <button
                  key={option}
                  type='button'
                  onClick={() => changeView(option)}
                  aria-pressed={view === option}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${
                    view === option ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Icon className='h-3.5 w-3.5' aria-hidden='true' />
                  {label}
                </button>
              ))}
              </div>
            </div>
          </div>

          {error && (
            <p className='card p-6 text-red-700'>Could not load listings. Please try again.</p>
          )}
          {!loading && !error && listings.length === 0 && (
            <div className='card flex flex-col items-center p-10 text-center'>
              <FaSearch className='h-8 w-8 text-slate-300' aria-hidden='true' />
              <p className='mt-3 text-lg font-semibold text-slate-800'>No listing found!</p>
              <p className='mt-1 text-sm text-slate-600'>Try removing a filter or searching for something else.</p>
            </div>
          )}

          {loading && <ListingGrid listings={[]} loading skeletons={6} columns='xl:grid-cols-3' />}

          {!loading && view === 'map' && listings.length > 0 && (
            <div>
              <ListingsMap listings={listings} className='h-[600px]' />
              {listings.some((l) => !l.location) && (
                <p className='mt-2 text-sm text-slate-500'>
                  {listings.filter((l) => !l.location).length} listing(s) have no location and aren&apos;t shown on the map.
                </p>
              )}
            </div>
          )}

          {!loading && view === 'list' && <ListingGrid listings={listings} columns='xl:grid-cols-3' />}

          {showMore && (
            <div className='mt-8 flex justify-center'>
              <button onClick={onShowMoreClick} disabled={loadingMore} className='btn-secondary px-6'>
                {loadingMore ? 'Loading...' : 'Show more'}
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
