import { createSlice } from '@reduxjs/toolkit';
import { signOutUserSuccess, deleteUserSuccess } from '../user/userSlice';

const inboxSlice = createSlice({
  name: 'inbox',
  initialState: { unreadCount: 0 },
  reducers: {
    setUnreadCount: (state, action) => {
      state.unreadCount = action.payload;
    },
  },
  extraReducers: (builder) => {
    const reset = (state) => {
      state.unreadCount = 0;
    };
    builder.addCase(signOutUserSuccess, reset).addCase(deleteUserSuccess, reset);
  },
});

export const { setUnreadCount } = inboxSlice.actions;

export default inboxSlice.reducer;
