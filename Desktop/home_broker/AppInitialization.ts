import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Provider } from 'react-redux';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { store } from './src/store/store';
import { setAuthToken } from './src/utils/api';
import MainNavigator from './src/navigation/MainNavigator';
import SplashScreen from './src/screens/SplashScreen';

const Stack = createStackNavigator();

export default function App() {
  useEffect(() => {
    // Initialize app and check for stored auth token
    const initializeApp = async () => {
      try {
        const token = await AsyncStorage.getItem('authToken');
        if (token) {
          setAuthToken(token);
        }
      } catch (error) {
        console.log('Error initializing app:', error);
      }
    };

    initializeApp();
  }, []);

  return (
    <Provider store={store}>
      <NavigationContainer>
        <StatusBar style="dark" />
        <MainNavigator />
      </NavigationContainer>
    </Provider>
  );
}