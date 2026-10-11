import { Link } from 'react-router-dom';
import { MdLocationOn } from 'react-icons/md';
import { FaBath, FaBed, FaStar } from 'react-icons/fa';
import FavoriteButton from './FavoriteButton';
import CompareButton from './CompareButton';

const FALLBACK_IMAGE =
  'https://53.fs1.hubspotusercontent-na1.net/hub/53/hubfs/Sales_Blog/real-estate-business-compressor.jpg?width=595&height=400&name=real-estate-business-compressor.jpg';

export default function ListingItem({ listing }) {
  const price = listing.offer ? listing.discountPrice : listing.regularPrice;
  const percentOff =
    listing.offer && listing.regularPrice > 0
      ? Math.round(((listing.regularPrice - listing.discountPrice) / listing.regularPrice) * 100)
      : 0;

  return (
    <article className='group relative flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card transition-shadow hover:shadow-card-hover'>
      <FavoriteButton listingId={listing._id} className='absolute right-3 top-3 z-10' />
      <CompareButton listingId={listing._id} className='absolute right-3 top-16 z-10' />
      <Link to={`/listing/${listing._id}`} className='flex flex-1 flex-col'>
        <div className='relative aspect-[4/3] overflow-hidden bg-slate-100'>
          <img
            src={listing.imageUrls[0] || FALLBACK_IMAGE}
            alt='listing cover'
            loading='lazy'
            className='h-full w-full object-cover transition-transform duration-300 group-hover:scale-105'
          />
          <div className='absolute left-3 top-3 flex gap-1.5'>
            <span className='badge bg-white/95 text-slate-800 shadow-sm'>
              {listing.type === 'rent' ? 'For rent' : 'For sale'}
            </span>
            {percentOff > 0 && <span className='badge bg-emerald-600 text-white shadow-sm'>{percentOff}% off</span>}
          </div>
        </div>
        <div className='flex flex-1 flex-col gap-1.5 p-4'>
          <div className='flex items-start justify-between gap-2'>
            <p className='text-lg font-bold text-slate-900'>
              ${price.toLocaleString('en-US')}
              {listing.type === 'rent' && <span className='text-sm font-medium text-slate-500'> / month</span>}
            </p>
            {listing.ratingCount > 0 && (
              <span
                className='mt-1 flex shrink-0 items-center gap-1 text-sm text-slate-600'
                aria-label={`Rated ${listing.ratingAverage.toFixed(1)} out of 5 from ${listing.ratingCount} reviews`}
              >
                <FaStar className='text-amber-500' aria-hidden='true' />
                {listing.ratingAverage.toFixed(1)}
                <span className='text-slate-400'>({listing.ratingCount})</span>
              </span>
            )}
          </div>
          <h3 className='truncate font-semibold text-slate-800'>{listing.name}</h3>
          <p className='flex items-center gap-1 text-sm text-slate-500'>
            <MdLocationOn className='h-4 w-4 shrink-0 text-brand-600' aria-hidden='true' />
            <span className='truncate'>{listing.address}</span>
          </p>
          <p className='line-clamp-2 text-sm text-slate-600'>{listing.description}</p>
          <div className='mt-auto flex gap-4 border-t border-slate-100 pt-3 text-sm text-slate-600'>
            <span className='flex items-center gap-1.5'>
              <FaBed className='text-slate-400' aria-hidden='true' />
              <span>{listing.bedrooms > 1 ? `${listing.bedrooms} beds` : `${listing.bedrooms} bed`}</span>
            </span>
            <span className='flex items-center gap-1.5'>
              <FaBath className='text-slate-400' aria-hidden='true' />
              <span>{listing.bathrooms > 1 ? `${listing.bathrooms} baths` : `${listing.bathrooms} bath`}</span>
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
