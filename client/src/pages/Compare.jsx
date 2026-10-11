import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { FaBalanceScale, FaTimes } from 'react-icons/fa';
import { useFetchJson } from '../hooks/useFetchJson';
import { buildComparisonRows, differingAttributes } from '../utils/compare';
import { MAX_COMPARE, removeFromCompare } from '../redux/compare/compareSlice';

const FALLBACK_IMAGE =
  'https://53.fs1.hubspotusercontent-na1.net/hub/53/hubfs/Sales_Blog/real-estate-business-compressor.jpg?width=595&height=400&name=real-estate-business-compressor.jpg';

export default function Compare() {
  const dispatch = useDispatch();
  const ids = useSelector((state) => state.compare.ids);
  const { data, error, loading } = useFetchJson(`/api/listing/compare?ids=${ids.join(',')}`);

  const listings = Array.isArray(data) ? data : [];
  const rows = buildComparisonRows(listings);
  const differing = differingAttributes(listings);

  if (ids.length === 0) {
    return (
      <main className='container-page py-16 text-center'>
        <FaBalanceScale className='mx-auto h-10 w-10 text-slate-300' aria-hidden='true' />
        <h1 className='page-title mt-3'>Compare homes</h1>
        <p className='mt-2 text-slate-600'>
          Pick up to {MAX_COMPARE} homes with the compare button on any listing, then see them side by side here.
        </p>
        <Link to='/search' className='btn-primary mt-6'>
          Browse homes
        </Link>
      </main>
    );
  }

  return (
    <main className='container-page py-6 sm:py-8'>
      <h1 className='page-title'>Compare homes</h1>
      <p className='mt-1 text-sm text-slate-600'>
        Showing {listings.length} of {ids.length} selected. Differences are highlighted.
      </p>

      {loading && !data && <p className='mt-6 text-slate-600'>Loading...</p>}
      {error && <p className='mt-6 text-red-700'>{error}</p>}

      {listings.length >= 1 && (
        <div className='mt-6 overflow-x-auto'>
          <table className='w-full min-w-[640px] border-collapse text-sm'>
            <caption className='sr-only'>Comparison of the selected listings</caption>
            <thead>
              <tr>
                <th scope='col' className='w-40 p-3 text-left align-bottom text-slate-500'>
                  Attribute
                </th>
                {listings.map((listing) => (
                  <th key={listing._id} scope='col' className='min-w-[200px] p-3 text-left align-top'>
                    <div className='flex flex-col gap-2'>
                      <Link to={`/listing/${listing._id}`} className='block'>
                        <img
                          src={listing.imageUrls[0] || FALLBACK_IMAGE}
                          alt=''
                          className='h-28 w-full rounded-lg object-cover'
                        />
                        <span className='mt-2 block font-semibold text-slate-800 hover:underline'>{listing.name}</span>
                      </Link>
                      <button
                        type='button'
                        onClick={() => dispatch(removeFromCompare(listing._id))}
                        className='flex items-center gap-1 self-start text-xs text-slate-500 hover:text-red-700'
                      >
                        <FaTimes className='h-3 w-3' aria-hidden='true' /> Remove
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const highlight = differing.has(row.attribute);
                return (
                  <tr key={row.attribute} className='border-t border-slate-100'>
                    <th scope='row' className='p-3 text-left font-medium text-slate-600'>
                      {row.label}
                    </th>
                    {row.values.map((value, index) => (
                      <td
                        key={listings[index]._id}
                        className={`p-3 ${highlight ? 'font-semibold text-slate-900' : 'text-slate-700'}`}
                      >
                        {value}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && listings.length === 0 && (
        <p className='mt-6 text-slate-600'>We couldn&apos;t find those listings. They may have been removed.</p>
      )}
    </main>
  );
}
