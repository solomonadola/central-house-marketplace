import { useSearchParams } from 'react-router-dom';
import AdminOverview from '../components/admin/AdminOverview';
import AdminReports from '../components/admin/AdminReports';
import AdminUsers from '../components/admin/AdminUsers';
import AdminHiddenListings from '../components/admin/AdminHiddenListings';
import AdminAuditLog from '../components/admin/AdminAuditLog';
import AdminContent from '../components/admin/AdminContent';

const TABS = [
  ['overview', 'Overview', AdminOverview],
  ['reports', 'Reports', AdminReports],
  ['users', 'Users', AdminUsers],
  ['hidden', 'Hidden listings', AdminHiddenListings],
  ['content', 'Reviews & questions', AdminContent],
  ['audit', 'Audit log', AdminAuditLog],
];

export default function Admin() {
  const [searchParams, setSearchParams] = useSearchParams();
  const active = TABS.find(([id]) => id === searchParams.get('tab')) ?? TABS[0];
  const [activeId, , ActiveTab] = active;

  return (
    <main className='max-w-5xl mx-auto p-3'>
      <h1 className='text-3xl font-semibold text-slate-700 my-5'>Admin</h1>
      <nav className='flex flex-wrap gap-2 border-b mb-5' role='tablist'>
        {TABS.map(([id, label]) => (
          <button
            key={id}
            type='button'
            role='tab'
            aria-selected={id === activeId}
            onClick={() => setSearchParams({ tab: id })}
            className={`px-3 py-2 -mb-px border-b-2 ${
              id === activeId ? 'border-slate-700 text-slate-700 font-semibold' : 'border-transparent text-slate-500'
            }`}
          >
            {label}
          </button>
        ))}
      </nav>
      <div role='tabpanel'>
        <ActiveTab />
      </div>
    </main>
  );
}
