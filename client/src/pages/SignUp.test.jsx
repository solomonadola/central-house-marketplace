import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import SignUp from './SignUp';
import SignIn from './SignIn';
import { renderWithProviders } from '../test/utils';

// The Google button imports Firebase, which isn't needed here.
vi.mock('../components/OAuth', () => ({ default: () => null }));

describe('sign up', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('tells new users to check their email', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify('User created successfully!'), { status: 201 })));
    renderWithProviders(
      <Routes>
        <Route path='/sign-up' element={<SignUp />} />
        <Route path='/sign-in' element={<SignIn />} />
      </Routes>,
      { route: '/sign-up' }
    );

    await userEvent.type(screen.getByLabelText('Username'), 'newbie');
    await userEvent.type(screen.getByLabelText('Email'), 'newbie@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'longenough');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText(/We sent you a link to confirm your email/)).toBeInTheDocument();
  });
});
