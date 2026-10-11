import { combineReducers, configureStore } from '@reduxjs/toolkit';
import userReducer from './user/userSlice';
import inboxReducer from './inbox/inboxSlice';
import notificationReducer from './notifications/notificationSlice';
import compareReducer from './compare/compareSlice';
import { persistReducer, persistStore } from 'redux-persist';
import storage from 'redux-persist/lib/storage';

const rootReducer = combineReducers({
  user: userReducer,
  inbox: inboxReducer,
  notifications: notificationReducer,
  compare: compareReducer,
});

const persistConfig = {
  key: 'root',
  storage,
  version: 1,
  // The unread count is refetched on load, so don't persist it. The compare
  // basket is worth keeping across reloads.
  whitelist: ['user', 'compare'],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export const persistor = persistStore(store);
