// Display metadata for each application status.
export const APPLICATION_STATUS = {
  submitted: { label: 'Submitted', tone: 'bg-sky-100 text-sky-800' },
  under_review: { label: 'Under review', tone: 'bg-amber-100 text-amber-800' },
  approved: { label: 'Approved', tone: 'bg-green-100 text-green-800' },
  rejected: { label: 'Declined', tone: 'bg-red-100 text-red-800' },
  withdrawn: { label: 'Withdrawn', tone: 'bg-slate-200 text-slate-700' },
};

export const applicationStatus = (status) =>
  APPLICATION_STATUS[status] ?? { label: status, tone: 'bg-slate-200 text-slate-700' };

export const isOpen = (status) => ['submitted', 'under_review'].includes(status);

// A short human summary of the money/occupants an application declares.
export const describeApplication = (application) => {
  const parts = [];
  if (application.occupants) parts.push(`${application.occupants} ${application.occupants === 1 ? 'occupant' : 'occupants'}`);
  if (application.income) parts.push(`$${application.income.toLocaleString('en-US')} income`);
  if (application.moveInDate) {
    parts.push(`move in ${new Date(application.moveInDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`);
  }
  return parts.join(' · ');
};
