import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import uiReducer from './slices/uiSlice';
import accountsReducer from './slices/accountsSlice';
import contactsReducer from './slices/contactsSlice';
import leadsReducer from './slices/leadsSlice';
import opportunitiesReducer from './slices/opportunitiesSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
    accounts: accountsReducer,
    contacts: contactsReducer,
    leads: leadsReducer,
    opportunities: opportunitiesReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;