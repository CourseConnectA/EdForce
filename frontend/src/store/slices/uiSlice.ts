import { createSlice, PayloadAction } from '@reduxjs/toolkit';

const uiSlice = createSlice({
  name: 'ui',
  initialState: { sidebarOpen: false, loading: false },
  reducers: {
    toggleSidebar: (state) => { state.sidebarOpen = !state.sidebarOpen; },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => { state.sidebarOpen = action.payload; },
    setLoading: (state, action) => { state.loading = action.payload; }
  },
});

export const { toggleSidebar, setSidebarOpen, setLoading } = uiSlice.actions;
export default uiSlice.reducer;
