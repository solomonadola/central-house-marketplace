import { store } from '../redux/store';
import { signOutUserSuccess } from '../redux/user/userSlice';

// Server error codes meaning this browser should no longer act signed in.
const SIGN_OUT_CODES = ['AUTH_REQUIRED', 'ACCOUNT_SUSPENDED'];

// fetch() for our API. When the server says the session is no longer
// valid (expired, revoked or suspended), clear the persisted user so the
// UI stops showing a signed-in state and private routes redirect to sign-in.
export const apiFetch = async (url, options) => {
  const res = await fetch(url, options);

  if (res.status === 401 || res.status === 403) {
    const data = await res
      .clone()
      .json()
      .catch(() => null);
    if (SIGN_OUT_CODES.includes(data?.code) && store.getState().user.currentUser) {
      store.dispatch(signOutUserSuccess());
    }
  }

  return res;
};
