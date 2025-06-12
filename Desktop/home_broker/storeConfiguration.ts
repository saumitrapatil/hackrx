import { configureStore } from '@reduxjs/toolkit';
import authSlice from './slices/authSlice';
import propertiesSlice from './slices/propertiesSlice';
import projectsSlice from './slices/projectsSlice';
import messagesSlice from './slices/messagesSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    properties: propertiesSlice,
    projects: projectsSlice,
    messages: messagesSlice,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;