import { useState } from 'react';
import { useFetchJson } from '../hooks/useFetchJson';
import { apiFetch } from '../utils/apiFetch';

const send = async (url, method, body) => {
  const res = await apiFetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body && { body: JSON.stringify(body) }),
  });
  return res.json();
};

function ReplyForm({ initial = { title: '', body: '' }, submitLabel, onSubmit, onCancel }) {
  const [title, setTitle] = useState(initial.title);
  const [body, setBody] = useState(initial.body);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const message = await onSubmit({ title, body });
    setSaving(false);
    if (message) setError(message);
  };

  return (
    <form onSubmit={submit} className='flex flex-col gap-2 p-4'>
      <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={40} placeholder='Name, e.g. Viewing times' aria-label='Reply name' className='input' />
      <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={1000} rows={3} placeholder='The message to insert' aria-label='Reply text' className='input' />
      {error && <p className='text-sm text-red-700'>{error}</p>}
      <div className='flex gap-2'>
        <button disabled={saving || !title.trim() || !body.trim()} className='btn-primary px-3 py-1.5 text-xs'>
          {submitLabel}
        </button>
        {onCancel && (
          <button type='button' onClick={onCancel} className='btn-ghost px-3 py-1.5 text-xs'>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

// Add, edit and delete saved quick replies.
export default function QuickRepliesManager() {
  const { data, reload } = useFetchJson('/api/quick-replies');
  const replies = Array.isArray(data) ? data : [];
  const [editing, setEditing] = useState(null);

  const save = (url, method) => async (fields) => {
    const result = await send(url, method, fields);
    if (result.success === false) return result.message;
    setEditing(null);
    reload();
    return null;
  };

  const remove = async (id) => {
    await send(`/api/quick-replies/${id}`, 'DELETE');
    reload();
  };

  return (
    <section id='quick-replies' aria-labelledby='quick-replies-title' className='mt-10'>
      <h2 id='quick-replies-title' className='text-lg font-semibold text-slate-900'>
        Quick replies
      </h2>
      <p className='mt-1 text-sm text-slate-600'>Save answers you send often and insert them into any conversation.</p>
      <div className='card mt-3 divide-y divide-slate-100'>
        {replies.map((reply) =>
          editing === reply._id ? (
            <ReplyForm
              key={reply._id}
              initial={reply}
              submitLabel='Save'
              onSubmit={save(`/api/quick-replies/${reply._id}`, 'PATCH')}
              onCancel={() => setEditing(null)}
            />
          ) : (
            <div key={reply._id} className='flex items-start gap-3 p-4'>
              <div className='min-w-0 flex-1'>
                <p className='font-semibold text-slate-800'>{reply.title}</p>
                <p className='whitespace-pre-wrap text-sm text-slate-600'>{reply.body}</p>
              </div>
              <button type='button' onClick={() => setEditing(reply._id)} className='text-xs text-slate-600 hover:underline'>
                Edit
              </button>
              <button type='button' onClick={() => remove(reply._id)} className='text-xs text-red-700 hover:underline'>
                Delete
              </button>
            </div>
          )
        )}
        <ReplyForm key={replies.length} submitLabel='Add reply' onSubmit={save('/api/quick-replies', 'POST')} />
      </div>
    </section>
  );
}
