import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useFetchJson } from '../hooks/useFetchJson';
import { apiFetch } from '../utils/apiFetch';
import { formatShortTime } from '../utils/formatTime';
import FlagContentButton from './FlagContentButton';

const postJson = async (url, body) => {
  const res = await apiFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
};

function AskForm({ listingId, onAsked }) {
  const [question, setQuestion] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      const data = await postJson(`/api/questions/listing/${listingId}`, { question });
      if (data.success === false) {
        setError(data.message);
        return;
      }
      setQuestion('');
      onAsked();
    } catch {
      setError('Could not send your question. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={submit} className='card flex flex-col gap-3 p-4'>
      <label htmlFor='ask-question' className='label'>
        Ask the owner a question
      </label>
      <textarea
        id='ask-question'
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        rows={2}
        maxLength={500}
        placeholder='e.g. Are pets allowed? Is there storage?'
        className='input'
      />
      <p className='text-xs text-slate-500'>Your question and the answer will be visible to everyone.</p>
      {error && <p className='text-sm text-red-700'>{error}</p>}
      <button disabled={sending || question.trim().length < 5} className='btn-primary self-start'>
        {sending ? 'Sending...' : 'Ask question'}
      </button>
    </form>
  );
}

function AnswerForm({ question, onAnswered }) {
  const [answer, setAnswer] = useState(question.answer?.body ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const data = await postJson(`/api/questions/${question._id}/answer`, { answer });
      if (data.success === false) {
        setError(data.message);
        return;
      }
      onAnswered();
    } catch {
      setError('Could not save your answer. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className='mt-2 flex flex-col gap-2'>
      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        rows={2}
        maxLength={1000}
        aria-label={`Answer to: ${question.question}`}
        placeholder='Write an answer everyone can see'
        className='input'
      />
      {error && <p className='text-sm text-red-700'>{error}</p>}
      <button disabled={saving || !answer.trim()} className='btn-secondary self-start px-3 py-1.5 text-xs'>
        {saving ? 'Saving...' : question.answer?.body ? 'Update answer' : 'Post answer'}
      </button>
    </form>
  );
}

// Public questions about a listing and the owner's answers.
export default function ListingQuestions({ listingId }) {
  const { currentUser } = useSelector((state) => state.user);
  const { data, error, reload } = useFetchJson(`/api/questions/listing/${listingId}`);
  const [editing, setEditing] = useState(null);

  if (error) return null;
  const questions = Array.isArray(data?.questions) ? data.questions : [];
  const viewer = data?.viewer;

  const remove = async (id) => {
    await apiFetch(`/api/questions/${id}`, { method: 'DELETE' });
    reload();
  };

  return (
    <section id='questions' aria-labelledby='questions-title' className='flex flex-col gap-3'>
      <h2 id='questions-title' className='text-xl font-semibold text-slate-900'>
        Questions &amp; answers
      </h2>

      {viewer?.canAsk && <AskForm listingId={listingId} onAsked={reload} />}
      {!currentUser && (
        <p className='text-sm text-slate-600'>
          <Link to='/sign-in' className='font-semibold text-brand-700'>
            Sign in
          </Link>{' '}
          to ask the owner a question.
        </p>
      )}

      {data && questions.length === 0 && <p className='text-sm text-slate-600'>No questions yet.</p>}

      <ul className='flex flex-col gap-3'>
        {questions.map((q) => {
          const answered = Boolean(q.answer?.body);
          const isAsker = currentUser && q.asker?._id === currentUser._id;
          return (
            <li key={q._id} className='card p-4'>
              <p className='font-medium text-slate-900'>
                <span className='mr-2 font-bold text-brand-700'>Q</span>
                {q.question}
              </p>
              <p className='mt-1 text-xs text-slate-500'>
                Asked by {q.asker?.username ?? 'a former user'} · {formatShortTime(q.createdAt)}
                {!answered && <span className='badge ml-2 bg-amber-50 text-amber-700'>Awaiting answer</span>}
              </p>
              {answered && editing !== q._id && (
                <p className='mt-3 border-l-2 border-brand-200 pl-3 text-slate-700'>
                  <span className='mr-2 font-bold text-slate-900'>A</span>
                  {q.answer.body}
                </p>
              )}
              {viewer?.isOwner && (!answered || editing === q._id) && (
                <AnswerForm
                  question={q}
                  onAnswered={() => {
                    setEditing(null);
                    reload();
                  }}
                />
              )}
              <div className='mt-2 flex flex-wrap gap-3 text-xs'>
                {currentUser && !isAsker && <FlagContentButton targetType='question' targetId={q._id} />}
                {viewer?.isOwner && answered && editing !== q._id && (
                  <button type='button' onClick={() => setEditing(q._id)} className='text-slate-600 hover:underline'>
                    Edit answer
                  </button>
                )}
                {(viewer?.isOwner || (isAsker && !answered)) && (
                  <button type='button' onClick={() => remove(q._id)} className='text-red-700 hover:underline'>
                    {isAsker && !viewer?.isOwner ? 'Withdraw' : 'Delete'}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
