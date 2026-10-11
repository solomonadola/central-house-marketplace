import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaChevronDown } from 'react-icons/fa';

const FAQS = [
  {
    q: 'How do I list my home?',
    a: 'Sign in, choose "Post a listing", add photos and details, and publish. You can pause or duplicate it any time from your account page.',
  },
  {
    q: 'How do I contact a landlord?',
    a: 'Open a listing and use "Message the owner". Your conversation stays inside Central House, so your email address is never shared.',
  },
  {
    q: 'How do viewings work?',
    a: 'Request a viewing from a listing. If the owner has added availability slots you can only pick those times; they accept or decline and you\'re notified either way.',
  },
  {
    q: 'What is a holding deposit?',
    a: 'Once an owner approves your application you can pay a refundable holding deposit to reserve the home. The owner can refund it if the deal does not go ahead.',
  },
  {
    q: 'Can I save a search?',
    a: 'Yes. Run a search, then choose "Save this search". We\'ll notify you when a matching home is listed, and you can pause alerts any time.',
  },
  {
    q: 'How do reviews work?',
    a: 'You can review a listing after you have contacted its owner. Owners can reply publicly, and readers can mark reviews as helpful.',
  },
  {
    q: 'How do I report a suspicious listing?',
    a: 'Open the listing and choose "Report". Our moderators review every report and can hide listings that break the rules.',
  },
  {
    q: 'How do I change my email notifications?',
    a: 'Go to Notification settings from your account page and choose which emails you want to receive.',
  },
];

function Faq({ item }) {
  const [open, setOpen] = useState(false);
  return (
    <li className='card overflow-hidden'>
      <button
        type='button'
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className='flex w-full items-center justify-between gap-3 p-4 text-left'
      >
        <span className='font-medium text-slate-800'>{item.q}</span>
        <FaChevronDown className={`h-3 w-3 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden='true' />
      </button>
      {open && <p className='px-4 pb-4 text-sm text-slate-600'>{item.a}</p>}
    </li>
  );
}

export default function Help() {
  return (
    <main className='container-page max-w-3xl py-6 sm:py-8'>
      <h1 className='page-title'>Help &amp; FAQ</h1>
      <p className='mt-1 text-sm text-slate-600'>Answers to the questions we hear most.</p>

      <ul className='mt-6 flex flex-col gap-3'>
        {FAQS.map((item) => (
          <Faq key={item.q} item={item} />
        ))}
      </ul>

      <p className='mt-8 text-sm text-slate-600'>
        Still stuck?{' '}
        <Link to='/about' className='font-medium text-brand-700 hover:underline'>
          Learn more about Central House
        </Link>
        .
      </p>
    </main>
  );
}
