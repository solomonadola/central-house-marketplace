import { createSlice } from '@reduxjs/toolkit';

export const MAX_COMPARE = 4;

const compareSlice = createSlice({
  name: 'compare',
  initialState: { ids: [] },
  reducers: {
    toggleCompare: (state, action) => {
      const id = action.payload;
      if (state.ids.includes(id)) {
        state.ids = state.ids.filter((item) => item !== id);
      } else if (state.ids.length < MAX_COMPARE) {
        state.ids.push(id);
      }
    },
    removeFromCompare: (state, action) => {
      state.ids = state.ids.filter((id) => id !== action.payload);
    },
    clearCompare: (state) => {
      state.ids = [];
    },
  },
});

export const { toggleCompare, removeFromCompare, clearCompare } = compareSlice.actions;

export default compareSlice.reducer;
