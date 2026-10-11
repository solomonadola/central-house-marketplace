import { render } from '@testing-library/react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import userReducer from '../redux/user/userSlice';
import inboxReducer from '../redux/inbox/inboxSlice';
import notificationReducer from '../redux/notifications/notificationSlice';
import compareReducer from '../redux/compare/compareSlice';

// Renders with a fresh (non-persisted) Redux store and an in-memory router.
export const renderWithProviders = (
  ui,
  { currentUser = null, route = '/', unreadCount = 0, notifications = [], compareIds = [] } = {}
) => {
  const store = configureStore({
    reducer: {
      user: userReducer,
      inbox: inboxReducer,
      notifications: notificationReducer,
      compare: compareReducer,
    },
    preloadedState: {
      user: { currentUser, error: null, loading: false },
      inbox: { unreadCount },
      notifications: { items: notifications, unreadCount: notifications.filter((n) => !n.read).length },
      compare: { ids: compareIds },
    },
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
