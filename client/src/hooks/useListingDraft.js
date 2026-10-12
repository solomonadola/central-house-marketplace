import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiFetch } from '../utils/apiFetch';

// Draft support for the create-listing form. When the URL has ?draft=<id>
// the draft's fields are loaded into the form via onLoad. saveDraft()
// creates the draft the first time and updates it afterwards; discardDraft()
// removes it once the listing has been published.
export const useListingDraft = (formData, onLoad) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [draftId, setDraftId] = useState(searchParams.get('draft'));
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [error, setError] = useState(null);
  // The draft the form already holds. Saving a new draft puts its id in the
  // URL; without this the effect would reload it and overwrite newer edits.
  const loadedId = useRef(null);

  useEffect(() => {
    const id = searchParams.get('draft');
    if (!id || id === loadedId.current) return undefined;
    let cancelled = false;
    apiFetch(`/api/listing-drafts/${id}`)
      .then((res) => res.json())
      .then((draft) => {
        if (cancelled) return;
        if (draft.success === false) {
          setError('That draft no longer exists.');
          setDraftId(null);
          return;
        }
        loadedId.current = draft._id;
        setDraftId(draft._id);
        setSavedAt(draft.updatedAt);
        onLoad(draft.data ?? {});
      })
      .catch(() => !cancelled && setError('Could not load the draft.'));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per draft id
  }, [searchParams.get('draft')]);

  const saveDraft = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch(draftId ? `/api/listing-drafts/${draftId}` : '/api/listing-drafts', {
        method: draftId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: formData }),
      });
      const draft = await res.json();
      if (draft.success === false) {
        setError(draft.message);
        return;
      }
      setSavedAt(draft.updatedAt);
      if (!draftId) {
        loadedId.current = draft._id;
        setDraftId(draft._id);
        // Keep the draft id in the URL so a refresh doesn't lose it.
        setSearchParams({ draft: draft._id }, { replace: true });
      }
    } catch {
      setError('Could not save the draft. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [draftId, formData, setSearchParams]);

  const discardDraft = useCallback(async () => {
    if (!draftId) return;
    try {
      await apiFetch(`/api/listing-drafts/${draftId}`, { method: 'DELETE' });
    } catch {
      // The listing is published; a leftover draft is harmless.
    }
  }, [draftId]);

  return { draftId, saveDraft, discardDraft, saving, savedAt, error };
};
