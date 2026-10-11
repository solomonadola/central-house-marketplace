// Labels and styles for maintenance requests, shared by the list and
// detail pages. Mirrors MAINTENANCE_* in api/models/maintenanceRequest.model.js.
export const CATEGORY_LABELS = {
  plumbing: 'Plumbing',
  electrical: 'Electrical',
  heating: 'Heating & cooling',
  appliance: 'Appliance',
  pest: 'Pests',
  structural: 'Structural',
  other: 'Other',
};

export const URGENCY_LABELS = { low: 'Low', normal: 'Normal', urgent: 'Urgent' };

export const STATUS_LABELS = {
  open: 'Open',
  in_progress: 'In progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

export const STATUS_STYLES = {
  open: 'bg-amber-50 text-amber-800 ring-amber-200',
  in_progress: 'bg-sky-50 text-sky-800 ring-sky-200',
  resolved: 'bg-green-50 text-green-800 ring-green-200',
  closed: 'bg-slate-100 text-slate-700 ring-slate-200',
};

// Button text for moving a request to each status.
export const STATUS_ACTIONS = {
  open: 'Reopen',
  in_progress: 'Start work',
  resolved: 'Mark resolved',
  closed: 'Close request',
};
