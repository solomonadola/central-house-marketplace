import { useEffect, useState } from 'react';
import { FaBan } from 'react-icons/fa';
import { apiFetch } from '../utils/apiFetch';

// Block / Unblock toggle for another user. Calls onChange(blocked) so the
// parent can, for example, disable a message box.
export default function BlockUserButton({ userId, username, onChange }) {
  const [blocked, setBlocked] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiFetch(`/api/user/blocks/${userId}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && typeof data.blocked === 'boolean') {
          setBlocked(data.blocked);
          onChange?.(data.blocked);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch per user only
  }, [userId]);

  const toggle = async () => {
    if (!blocked && !window.confirm(`Block ${username}? Neither of you will be able to message the other.`)) return;
    setBusy(true);
    try {
      const res = await apiFetch(`/api/user/blocks/${userId}`, { method: blocked ? 'DELETE' : 'PUT' });
      const data = await res.json();
      if (typeof data.blocked === 'boolean') {
        setBlocked(data.blocked);
        onChange?.(data.blocked);
      }
    } finally {
      setBusy(false);
    }
  };

  if (blocked === null) return null;

  return (
    <button
      type='button'
      onClick={toggle}
      disabled={busy}
      className={`btn-ghost px-2 py-1 text-xs ${blocked ? 'text-slate-700' : 'text-red-700 hover:bg-red-50'}`}
    >
      <FaBan aria-hidden='true' /> {blocked ? 'Unblock' : 'Block'}
    </button>
  );
}
