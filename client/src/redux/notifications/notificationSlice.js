import { createSlice } from '@reduxjs/toolkit';
import { signOutUserSuccess, deleteUserSuccess } from '../user/userSlice';

const notificationSlice = createSlice({
  name: 'notifications',
  initialState: { items: [], unreadCount: 0 },
  reducers: {
    setNotifications: (state, action) => {
      state.items = action.payload;
    },
    setUnreadNotifications: (state, action) => {
      state.unreadCount = action.payload;
    },
    markNotificationRead: (state, action) => {
      const item = state.items.find((n) => n._id === action.payload);
      if (item && !item.read) {
        item.read = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },
    markAllNotificationsRead: (state) => {
      state.items = state.items.map((n) => ({ ...n, read: true }));
      state.unreadCount = 0;
    },
    removeNotification: (state, action) => {
      const item = state.items.find((n) => n._id === action.payload);
      if (item && !item.read) state.unreadCount = Math.max(0, state.unreadCount - 1);
      state.items = state.items.filter((n) => n._id !== action.payload);
    },
  },
  extraReducers: (builder) => {
    const reset = (state) => {
      state.items = [];
      state.unreadCount = 0;
    };
    builder.addCase(signOutUserSuccess, reset).addCase(deleteUserSuccess, reset);
  },
});

export const {
  setNotifications,
  setUnreadNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  removeNotification,
} = notificationSlice.actions;

export default notificationSlice.reducer;
