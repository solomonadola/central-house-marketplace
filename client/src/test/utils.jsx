import { render } from '@testing-library/react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import userReducer from '../redux/user/userSlice';

// Renders with a fresh (non-persisted) Redux store and an in-memory router.
export const renderWithProviders = (ui, { currentUser = null, route = '/' } = {}) => {
  const store = configureStore({
    reducer: { user: userReducer },
    preloadedState: { user: { currentUser, error: null, loading: false } },
  });

  return {
    store,
    ...render(
      <Provider store={store}>
        <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
      </Provider>
    ),
  };
};

export const makeListing = (overrides = {}) => ({
  _id: 'listing1',
  name: 'Bright Two-Bedroom Apartment',
  description: 'A lovely place to live.',
  address: '1 Test Street',
  regularPrice: 1200,
  discountPrice: 0,
  bathrooms: 1,
  bedrooms: 2,
  furnished: false,
  parking: true,
  type: 'rent',
  offer: false,
  imageUrls: ['https://example.com/photo.jpg'],
  userRef: 'user1',
  ...overrides,
});
