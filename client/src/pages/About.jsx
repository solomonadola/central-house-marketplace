import { Link } from 'react-router-dom';
import {
  FaCalendarCheck,
  FaComments,
  FaDoorOpen,
  FaFlag,
  FaHome,
  FaLock,
  FaSearch,
  FaShieldAlt,
  FaStar,
  FaTools,
} from 'react-icons/fa';

const AUDIENCES = [
  {
    title: 'Renters and buyers',
    points: [
      [FaSearch, 'Search by price, rooms, amenities or on the map, and save searches to hear about new homes.'],
      [FaComments, 'Message owners directly, with no middleman. Your email address stays private.'],
      [FaCalendarCheck, 'Request a viewing at a time that suits you, or drop in at an open house.'],
    ],
  },
  {
    title: 'Owners and landlords',
    points: [
      [FaHome, 'List a home for free, save drafts, and see views, saves and enquiries for each listing.'],
      [FaDoorOpen, 'Schedule open houses, accept viewing requests and review rental applications.'],
      [FaTools, 'Track maintenance requests from tenants from report to fix.'],
    ],
  },
];

const SAFETY = [
  [FaStar, 'Reviews come only from people who actually contacted the owner.'],
  [FaFlag, 'Anyone can report a listing, and moderators review every report.'],
  [FaLock, 'Optional two-step sign-in, and you can block anyone who bothers you.'],
  [FaShieldAlt, 'You can download all your data, or delete your account and everything in it.'],
];

export default function About() {
  return (
    <main className='container-page py-12'>
      <section className='max-w-3xl'>
        <h1 className='page-title'>About Central House Marketplace</h1>
        <p className='mt-4 text-lg text-slate-700'>
          Central House Marketplace connects people looking for a home with the people who own them. There are no
          agents in the middle: renters and buyers talk to owners directly, book viewings, and ask questions in the
          open, so everyone can see the answers.
        </p>
      </section>

      <section className='mt-12 grid gap-6 md:grid-cols-2' aria-label='Who it is for'>
        {AUDIENCES.map(({ title, points }) => (
          <div key={title} className='card p-6'>
            <h2 className='text-xl font-semibold text-slate-900'>{title}</h2>
            <ul className='mt-4 space-y-3'>
              {points.map(([Icon, text]) => (
                <li key={text} className='flex gap-3 text-slate-700'>
                  <Icon className='mt-1 h-4 w-4 shrink-0 text-brand-600' aria-hidden='true' />
                  {text}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className='mt-12' aria-labelledby='safety-title'>
        <h2 id='safety-title' className='text-xl font-semibold text-slate-900'>
          Trust and safety
        </h2>
        <ul className='mt-4 grid gap-4 sm:grid-cols-2'>
          {SAFETY.map(([Icon, text]) => (
            <li key={text} className='flex gap-3 rounded-xl bg-white p-4 text-slate-700 ring-1 ring-slate-200'>
              <Icon className='mt-1 h-4 w-4 shrink-0 text-emerald-600' aria-hidden='true' />
              {text}
            </li>
          ))}
        </ul>
      </section>

      <section className='mt-12 flex flex-wrap items-center gap-3'>
        <Link to='/search' className='btn-primary'>
          Browse homes
        </Link>
        <Link to='/create-listing' className='btn-secondary'>
          Post a listing
        </Link>
        <Link to='/help' className='btn-ghost'>
          Read the help &amp; FAQ
        </Link>
      </section>
    </main>
  );
}
