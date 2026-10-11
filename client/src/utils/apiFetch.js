import { store } from '../redux/store';
import { signOutUserSuccess } from '../redux/user/userSlice';

// fetch() for our API. When the server says the session is no longer
// valid (expired or missing token), clear the persisted user so the UI
// stops showing a signed-in state and private routes redirect to sign-in.
export const apiFetch = async (url, options) => {
  const res = await fetch(url, options);

  if (res.status === 401) {
    const data = await res
      .clone()
      .json()
      .catch(() => null);
    if (data?.code === 'AUTH_REQUIRED' && store.getState().user.currentUser) {
      store.dispatch(signOutUserSuccess());
    }
  }

  return res;
};
