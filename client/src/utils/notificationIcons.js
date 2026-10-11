import {
  FaBell,
  FaCalendarCheck,
  FaCalendarMinus,
  FaCalendarPlus,
  FaCalendarTimes,
  FaCheckCircle,
  FaEnvelope,
  FaEye,
  FaEyeSlash,
  FaFlag,
  FaHeartBroken,
  FaFileAlt,
  FaMoneyCheckAlt,
  FaStar,
  FaUserCheck,
  FaUserSlash,
} from 'react-icons/fa';

// Icon for each notification type, plus a tone used to colour it. Unknown
// types fall back to a generic bell so a new type never renders blank.
export const NOTIFICATION_ICONS = {
  message: { Icon: FaEnvelope, tone: 'text-sky-600 bg-sky-50' },
  viewing_requested: { Icon: FaCalendarPlus, tone: 'text-amber-600 bg-amber-50' },
  viewing_accepted: { Icon: FaCalendarCheck, tone: 'text-green-600 bg-green-50' },
  viewing_declined: { Icon: FaCalendarTimes, tone: 'text-red-600 bg-red-50' },
  viewing_cancelled: { Icon: FaCalendarMinus, tone: 'text-slate-600 bg-slate-100' },
  review: { Icon: FaStar, tone: 'text-yellow-600 bg-yellow-50' },
  report_received: { Icon: FaFlag, tone: 'text-red-600 bg-red-50' },
  report_resolved: { Icon: FaCheckCircle, tone: 'text-green-600 bg-green-50' },
  listing_hidden: { Icon: FaEyeSlash, tone: 'text-red-600 bg-red-50' },
  listing_unhidden: { Icon: FaEye, tone: 'text-green-600 bg-green-50' },
  account_suspended: { Icon: FaUserSlash, tone: 'text-red-600 bg-red-50' },
  account_unsuspended: { Icon: FaUserCheck, tone: 'text-green-600 bg-green-50' },
  saved_search_match: { Icon: FaStar, tone: 'text-brand-600 bg-brand-50' },
  listing_deleted: { Icon: FaHeartBroken, tone: 'text-slate-600 bg-slate-100' },
  application_received: { Icon: FaFileAlt, tone: 'text-sky-600 bg-sky-50' },
  application_status: { Icon: FaFileAlt, tone: 'text-green-600 bg-green-50' },
  payment_received: { Icon: FaMoneyCheckAlt, tone: 'text-green-600 bg-green-50' },
  payment_refunded: { Icon: FaMoneyCheckAlt, tone: 'text-sky-600 bg-sky-50' },
};

const FALLBACK = { Icon: FaBell, tone: 'text-slate-600 bg-slate-100' };

export const notificationIcon = (type) => NOTIFICATION_ICONS[type] ?? FALLBACK;
