import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ListingItem from '../components/ListingItem';
import { apiFetch } from '../utils/apiFetch';

export default function Search() {
  const navigate = useNavigate();
  const location = useLocation();
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
  });

  const [loading, setLoading] = useState(false);
  const [listings, setListings] = useState([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

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
  return (
    <div className='flex flex-col md:flex-row'>
      <div className='p-7  border-b-2 md:border-r-2 md:min-h-screen'>
        <form onSubmit={handleSubmit} className='flex flex-col gap-8'>
          <div className='flex items-center gap-2'>
            <label className='whitespace-nowrap font-semibold'>
              Search Term:
            </label>
            <input
              type='text'
              id='searchTerm'
              placeholder='Search...'
              className='border rounded-lg p-3 w-full'
              value={sidebardata.searchTerm}
              onChange={handleChange}
            />
          </div>
          <div className='flex gap-2 flex-wrap items-center'>
            <label className='font-semibold'>Type:</label>
            <div className='flex gap-2'>
              <input
                type='checkbox'
                id='all'
                className='w-5'
                onChange={handleChange}
                checked={sidebardata.type === 'all'}
              />
              <span>Rent & Sale</span>
            </div>
            <div className='flex gap-2'>
              <input
                type='checkbox'
                id='rent'
                className='w-5'
                onChange={handleChange}
                checked={sidebardata.type === 'rent'}
              />
              <span>Rent</span>
            </div>
            <div className='flex gap-2'>
              <input
                type='checkbox'
                id='sale'
                className='w-5'
                onChange={handleChange}
                checked={sidebardata.type === 'sale'}
              />
              <span>Sale</span>
            </div>
            <div className='flex gap-2'>
              <input
                type='checkbox'
                id='offer'
                className='w-5'
                onChange={handleChange}
                checked={sidebardata.offer}
              />
              <span>Offer</span>
            </div>
          </div>
          <div className='flex gap-2 flex-wrap items-center'>
            <label className='font-semibold'>Amenities:</label>
            <div className='flex gap-2'>
              <input
                type='checkbox'
                id='parking'
                className='w-5'
                onChange={handleChange}
                checked={sidebardata.parking}
              />
              <span>Parking</span>
            </div>
            <div className='flex gap-2'>
              <input
                type='checkbox'
                id='furnished'
                className='w-5'
                onChange={handleChange}
                checked={sidebardata.furnished}
              />
              <span>Furnished</span>
            </div>
          </div>
          <div className='flex gap-2 flex-wrap items-center'>
            <label className='font-semibold'>Price:</label>
            <input
              type='number'
              id='minPrice'
              min='0'
              placeholder='Min'
              aria-label='Minimum price'
              className='border rounded-lg p-3 w-28'
              value={sidebardata.minPrice}
              onChange={handleChange}
            />
            <span>-</span>
            <input
              type='number'
              id='maxPrice'
              min='0'
              placeholder='Max'
              aria-label='Maximum price'
              className='border rounded-lg p-3 w-28'
              value={sidebardata.maxPrice}
              onChange={handleChange}
            />
          </div>
          <div className='flex gap-4 flex-wrap items-center'>
            <div className='flex items-center gap-2'>
              <label htmlFor='minBedrooms' className='font-semibold'>
                Beds:
              </label>
              <select
                id='minBedrooms'
                className='border rounded-lg p-3'
                value={sidebardata.minBedrooms}
                onChange={handleChange}
              >
                <option value=''>Any</option>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}+
                  </option>
                ))}
              </select>
            </div>
            <div className='flex items-center gap-2'>
              <label htmlFor='minBathrooms' className='font-semibold'>
                Baths:
              </label>
              <select
                id='minBathrooms'
                className='border rounded-lg p-3'
                value={sidebardata.minBathrooms}
                onChange={handleChange}
              >
                <option value=''>Any</option>
                {[1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    {n}+
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className='flex items-center gap-2'>
            <label className='font-semibold'>Sort:</label>
            <select
              onChange={handleChange}
              value={`${sidebardata.sort}_${sidebardata.order}`}
              id='sort_order'
              className='border rounded-lg p-3'
            >
              <option value='regularPrice_desc'>Price high to low</option>
              <option value='regularPrice_asc'>Price low to high</option>
              <option value='createdAt_desc'>Latest</option>
              <option value='createdAt_asc'>Oldest</option>
            </select>
          </div>
          <button className='bg-slate-700 text-white p-3 rounded-lg uppercase hover:opacity-95'>
            Search
          </button>
        </form>
      </div>
      <div className='flex-1'>
        <div className='flex flex-wrap items-baseline justify-between gap-2 border-b p-3 mt-5'>
          <h1 className='text-3xl font-semibold text-slate-700'>
            Listing results:
          </h1>
          {!loading && !error && total > 0 && (
            <p className='text-slate-600'>
              Showing {listings.length} of {total}
            </p>
          )}
        </div>
        <div className='p-7 flex flex-wrap gap-4'>
          {error && (
            <p className='text-xl text-red-700'>
              Could not load listings. Please try again.
            </p>
          )}
          {!loading && !error && listings.length === 0 && (
            <p className='text-xl text-slate-700'>No listing found!</p>
          )}
          {loading && (
            <p className='text-xl text-slate-700 text-center w-full'>
              Loading...
            </p>
          )}

          {!loading &&
            listings &&
            listings.map((listing) => (
              <ListingItem key={listing._id} listing={listing} />
            ))}

          {showMore && (
            <button
              onClick={onShowMoreClick}
              disabled={loadingMore}
              className='text-green-700 hover:underline p-7 text-center w-full disabled:opacity-60'
            >
              {loadingMore ? 'Loading...' : 'Show more'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
