import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  message: '',
  type: 'info',
  visible: false,
};

const notificationSlice = createSlice({
  name: 'notification',
  initialState,
  reducers: {
    showNotification: (state, action) => {
      state.message = action.payload.message;
      state.type = action.payload.type || 'info';
      state.visible = true;
    },
    clearNotification: (state) => {
      state.visible = false;
      state.message = '';
    },
  },
});

export const { showNotification, clearNotification } = notificationSlice.actions;
export default notificationSlice.reducer;
