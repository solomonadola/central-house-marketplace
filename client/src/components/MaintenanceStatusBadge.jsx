import { STATUS_LABELS, STATUS_STYLES } from '../utils/maintenance';

export default function MaintenanceStatusBadge({ status }) {
  return <span className={`badge ring-1 ${STATUS_STYLES[status] ?? STATUS_STYLES.closed}`}>{STATUS_LABELS[status] ?? status}</span>;
}
