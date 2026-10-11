import ListingItem from './ListingItem';

// Responsive grid of listing cards, with optional placeholder cards while
// loading.
export default function ListingGrid({ listings, loading = false, skeletons = 6, columns = 'lg:grid-cols-3' }) {
  return (
    <div className={`grid gap-6 sm:grid-cols-2 ${columns}`}>
      {loading
        ? Array.from({ length: skeletons }, (_, i) => <ListingCardSkeleton key={i} />)
        : listings.map((listing) => <ListingItem key={listing._id} listing={listing} />)}
    </div>
  );
}

function ListingCardSkeleton() {
  return (
    <div className='overflow-hidden rounded-xl border border-slate-200 bg-white' aria-hidden='true'>
      <div className='aspect-[4/3] animate-pulse bg-slate-200' />
      <div className='space-y-3 p-4'>
        <div className='h-5 w-1/3 animate-pulse rounded bg-slate-200' />
        <div className='h-4 w-3/4 animate-pulse rounded bg-slate-200' />
        <div className='h-4 w-1/2 animate-pulse rounded bg-slate-100' />
      </div>
    </div>
  );
}
