import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import SwiperCore from 'swiper';
import { useSelector } from 'react-redux';
import { Navigation, Pagination } from 'swiper/modules';
import 'swiper/css/bundle';
import {
  FaArrowLeft,
  FaBath,
  FaBed,
  FaChair,
  FaCheck,
  FaEdit,
  FaEye,
  FaLink,
  FaMapMarkerAlt,
  FaParking,
} from 'react-icons/fa';
import Contact from '../components/Contact';
import FavoriteButton from '../components/FavoriteButton';
import ListingsMap from '../components/ListingsMap';
import ListingReviews from '../components/ListingReviews';
import ReportListing from '../components/ReportListing';
import RequestViewing from '../components/RequestViewing';
import { apiFetch } from '../utils/apiFetch';
import { recordView } from '../utils/recordView';

// https://sabe.io/blog/javascript-format-numbers-commas#:~:text=The%20best%20way%20to%20format,format%20the%20number%20with%20commas.

export default function Listing() {
  SwiperCore.use([Navigation, Pagination]);
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [contact, setContact] = useState(false);
  const params = useParams();
  const { currentUser } = useSelector((state) => state.user);

  useEffect(() => {
    const fetchListing = async () => {
      try {
        setLoading(true);
        const res = await apiFetch(`/api/listing/get/${params.listingId}`);
        const data = await res.json();
        if (data.success === false) {
          setError(true);
          setLoading(false);
          return;
        }
        setListing(data);
        setLoading(false);
        setError(false);
      } catch (error) {
        setError(true);
        setLoading(false);
      }
    };
    fetchListing();
  }, [params.listingId]);

  const isOwner = Boolean(listing && currentUser && listing.userRef === currentUser._id);

  useEffect(() => {
    if (listing && !isOwner) recordView(listing._id);
  }, [listing, isOwner]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be blocked; nothing useful to do.
    }
  };

  if (loading) return <ListingSkeleton />;

  if (error) {
    return (
      <main className='container-page py-20 text-center'>
        <h1 className='page-title'>Listing not found</h1>
        <p className='mt-2 text-slate-600'>Something went wrong! It may have been removed or hidden.</p>
        <Link to='/search' className='btn-primary mt-6'>
          Browse other homes
        </Link>
      </main>
    );
  }

  if (!listing) return null;

  const price = listing.offer ? listing.discountPrice : listing.regularPrice;
  const savings = listing.offer ? listing.regularPrice - listing.discountPrice : 0;
  const perMonth = listing.type === 'rent' ? ' / month' : '';

  const facts = [
    [FaBed, listing.bedrooms > 1 ? `${listing.bedrooms} beds` : `${listing.bedrooms} bed`],
    [FaBath, listing.bathrooms > 1 ? `${listing.bathrooms} baths` : `${listing.bathrooms} bath`],
    [FaParking, listing.parking ? 'Parking spot' : 'No parking'],
    [FaChair, listing.furnished ? 'Furnished' : 'Unfurnished'],
  ];

  return (
    <main className='container-page py-6'>
      <Link to='/search' className='inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900'>
        <FaArrowLeft className='h-3 w-3' aria-hidden='true' /> Back to search
      </Link>

      {listing.hidden && (
        <p role='status' className='mt-4 rounded-lg bg-amber-100 p-3 text-amber-900'>
          This listing is hidden from the public
          {listing.hiddenReason ? `: ${listing.hiddenReason}` : '.'}{' '}
          {isOwner && 'Contact support if you think this is a mistake.'}
        </p>
      )}

      <div className='mt-4 overflow-hidden rounded-2xl bg-slate-200'>
        <Swiper navigation pagination={{ type: 'fraction' }} className='listing-gallery'>
          {listing.imageUrls.map((url, i) => (
            <SwiperSlide key={url}>
              <img
                src={url}
                alt={`${listing.name}, photo ${i + 1} of ${listing.imageUrls.length}`}
                className='h-[280px] w-full object-cover sm:h-[420px] lg:h-[500px]'
              />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      {/* On phones the price card comes right after the title; on wide
          screens it sits in the right column next to everything else. */}
      <div className='mt-8 grid gap-8 lg:grid-cols-3'>
        <div className='flex flex-col gap-8 lg:col-span-2'>
          <section>
            <div className='flex flex-wrap gap-2'>
              <span className='badge bg-brand-50 text-brand-700 ring-1 ring-brand-200'>
                {listing.type === 'rent' ? 'For rent' : 'For sale'}
              </span>
              {listing.offer && (
                <span className='badge bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'>
                  ${savings.toLocaleString('en-US')} off
                </span>
              )}
            </div>
            <h1 className='mt-3 text-3xl font-bold tracking-tight text-slate-900'>{listing.name}</h1>
            <p className='mt-2 flex items-center gap-2 text-slate-600'>
              <FaMapMarkerAlt className='shrink-0 text-brand-600' aria-hidden='true' />
              {listing.address}
            </p>
          </section>

          <ul className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
            {facts.map(([Icon, label]) => (
              <li key={label} className='card flex flex-col items-start gap-2 p-4'>
                <Icon className='h-5 w-5 text-brand-600' aria-hidden='true' />
                <span className='text-sm font-semibold text-slate-800'>{label}</span>
              </li>
            ))}
          </ul>
        </div>

        <aside className='lg:col-start-3 lg:row-span-2 lg:row-start-1'>
          <div className='card sticky top-24 flex flex-col gap-4 p-5'>
            <div>
              <p className='text-3xl font-bold text-slate-900'>
                ${price.toLocaleString('en-US')}
                <span className='text-base font-medium text-slate-500'>{perMonth}</span>
              </p>
              {listing.offer && (
                <p className='mt-1 text-sm text-slate-500'>
                  <span className='line-through'>
                    ${listing.regularPrice.toLocaleString('en-US')}
                    {perMonth}
                  </span>{' '}
                  <span className='font-semibold text-emerald-700'>Save ${savings.toLocaleString('en-US')}</span>
                </p>
              )}
            </div>

            <div className='flex gap-2'>
              <FavoriteButton listingId={listing._id} className='shrink-0 border border-slate-200' />
              <button type='button' onClick={copyLink} className='btn-secondary flex-1'>
                {copied ? (
                  <>
                    <FaCheck aria-hidden='true' /> Link copied!
                  </>
                ) : (
                  <>
                    <FaLink aria-hidden='true' /> Share
                  </>
                )}
              </button>
            </div>

            {isOwner && (
              <div className='flex flex-col gap-3 border-t border-slate-100 pt-4'>
                <p className='flex items-center gap-2 text-sm text-slate-600'>
                  <FaEye className='text-slate-400' aria-hidden='true' />
                  <span>
                    {listing.views ?? 0} {listing.views === 1 ? 'view' : 'views'}
                  </span>
                </p>
                <Link to={`/update-listing/${listing._id}`} className='btn-primary'>
                  <FaEdit aria-hidden='true' /> Edit listing
                </Link>
              </div>
            )}

            {currentUser && !isOwner && (
              <div className='flex flex-col gap-3 border-t border-slate-100 pt-4'>
                {contact ? (
                  <Contact listing={listing} />
                ) : (
                  <button type='button' onClick={() => setContact(true)} className='btn-primary'>
                    Message the owner
                  </button>
                )}
                {!listing.hidden && <RequestViewing listingId={listing._id} />}
              </div>
            )}

            {!currentUser && (
              <div className='flex flex-col gap-2 border-t border-slate-100 pt-4'>
                <p className='text-sm text-slate-600'>Sign in to message the owner or book a viewing.</p>
                <Link to='/sign-in' className='btn-primary'>
                  Sign in to contact
                </Link>
              </div>
            )}
          </div>
        </aside>

        <div className='flex flex-col gap-8 lg:col-span-2'>
          <section>
            <h2 className='text-xl font-semibold text-slate-900'>About this home</h2>
            <p className='mt-3 whitespace-pre-line leading-relaxed text-slate-700'>{listing.description}</p>
          </section>

          {listing.location && (
            <section>
              <h2 className='mb-3 text-xl font-semibold text-slate-900'>Location</h2>
              <ListingsMap listings={[listing]} className='h-[350px]' />
            </section>
          )}

          <ListingReviews listingId={listing._id} />
          {currentUser && !isOwner && <ReportListing listingId={listing._id} />}
        </div>

      </div>
    </main>
  );
}

function ListingSkeleton() {
  return (
    <main className='container-page py-6' aria-busy='true' aria-label='Loading listing'>
      <div className='h-4 w-28 animate-pulse rounded bg-slate-200' />
      <div className='mt-4 h-[280px] animate-pulse rounded-2xl bg-slate-200 sm:h-[420px] lg:h-[500px]' />
      <div className='mt-8 grid gap-8 lg:grid-cols-3'>
        <div className='space-y-3 lg:col-span-2'>
          <div className='h-8 w-2/3 animate-pulse rounded bg-slate-200' />
          <div className='h-4 w-1/3 animate-pulse rounded bg-slate-200' />
        </div>
        <div className='h-48 animate-pulse rounded-xl bg-slate-200' />
      </div>
    </main>
  );
}
