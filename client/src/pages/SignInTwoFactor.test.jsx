import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import SignIn from './SignIn';
import TwoFactorSettings from '../components/TwoFactorSettings';
import { renderWithProviders } from '../test/utils';

// The Google button imports Firebase, which isn't needed here.
vi.mock('../components/OAuth', () => ({ default: () => null }));

const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), { status });

describe('two-step sign-in', () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = vi.fn(async (url, options) => {
      const body = options?.body ? JSON.parse(options.body) : {};
      if (url === '/api/auth/signin') return jsonResponse({ twoFactorRequired: true, challengeToken: 'tok1', email: 's****@example.com' });
      if (url === '/api/auth/verify-2fa') {
        return body.code === '123456'
          ? jsonResponse({ _id: 'u1', username: 'sarah' })
          : jsonResponse({ success: false, message: "That code isn't right. Check the email and try again." }, 401);
      }
      if (url === '/api/auth/resend-2fa') return jsonResponse({ challengeToken: 'tok2', email: 's****@example.com' });
      if (url === '/api/user/two-factor') {
        return body.password === 'right' ? jsonResponse({ twoFactorEnabled: body.enabled }) : jsonResponse({ success: false, message: 'Wrong password!' }, 401);
      }
      return jsonResponse({});
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  const renderSignIn = () =>
    renderWithProviders(
      <Routes>
        <Route path='/sign-in' element={<SignIn />} />
        <Route path='/' element={<p>Home page</p>} />
      </Routes>,
      { route: '/sign-in' }
    );

  const enterPassword = async () => {
    await userEvent.type(screen.getByLabelText('Email'), 'sarah@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'password123');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
  };

  it('asks for the emailed code and signs in with it', async () => {
    const { store } = renderSignIn();
    await enterPassword();

    expect(await screen.findByText('s****@example.com')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Sign-in code'), '12a3456');
    expect(screen.getByLabelText('Sign-in code')).toHaveValue('123456');
    await userEvent.click(screen.getByRole('button', { name: 'Verify and sign in' }));

    expect(await screen.findByText('Home page')).toBeInTheDocument();
    expect(store.getState().user.currentUser).toEqual({ _id: 'u1', username: 'sarah' });
    expect(JSON.parse(fetchMock.mock.calls.find(([u]) => u === '/api/auth/verify-2fa')[1].body)).toEqual({
      challengeToken: 'tok1',
      code: '123456',
    });
  });

  it('shows wrong-code errors and resends with the new token', async () => {
    renderSignIn();
    await enterPassword();

    await userEvent.type(await screen.findByLabelText('Sign-in code'), '000000');
    await userEvent.click(screen.getByRole('button', { name: 'Verify and sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent("That code isn't right");

    await userEvent.click(screen.getByRole('button', { name: 'Send a new code' }));
    expect(await screen.findByText('We sent a new code.')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Sign-in code'), '123456');
    await userEvent.click(screen.getByRole('button', { name: 'Verify and sign in' }));

    const verifies = fetchMock.mock.calls.filter(([u]) => u === '/api/auth/verify-2fa');
    expect(JSON.parse(verifies.at(-1)[1].body).challengeToken).toBe('tok2');
  });

  it('can go back to the password form', async () => {
    renderSignIn();
    await enterPassword();

    await userEvent.click(await screen.findByRole('button', { name: 'Use a different account' }));

    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });
});

describe('two-step sign-in settings', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('turns it on after confirming the password', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url, options) => {
        const body = JSON.parse(options.body);
        return body.password === 'right'
          ? new Response(JSON.stringify({ twoFactorEnabled: body.enabled }))
          : new Response(JSON.stringify({ success: false, message: 'Wrong password!' }), { status: 401 });
      })
    );
    const { store } = renderWithProviders(<TwoFactorSettings />, { currentUser: { _id: 'u1', twoFactorEnabled: false } });

    expect(screen.getByText('Off')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Turn on two-step sign-in' }));
    await userEvent.type(screen.getByLabelText('Enter your password to confirm'), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: 'Turn on' }));
    expect(await screen.findByText('Wrong password!')).toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText('Enter your password to confirm'));
    await userEvent.type(screen.getByLabelText('Enter your password to confirm'), 'right');
    await userEvent.click(screen.getByRole('button', { name: 'Turn on' }));

    expect(await screen.findByText('On')).toBeInTheDocument();
    expect(store.getState().user.currentUser.twoFactorEnabled).toBe(true);
  });
});
