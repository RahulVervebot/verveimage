import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from './components/LoginScreen';  // Import your LoginScreen
import MainScreen from './components/MainFile';    // Import your MainScreen
import AsyncStorage from '@react-native-async-storage/async-storage';  // Import AsyncStorage


const App = () => {
  const Stack = createStackNavigator();
const [isAuthenticated, setIsAuthenticated] = useState(false);
useEffect(() => {
  // Check if folderName exists in AsyncStorage
  const checkAuthentication = async () => {
    try {
      const folderName = await AsyncStorage.getItem('folderName');
      if (folderName !== null && folderName !== '') {
        setIsAuthenticated(true);  // If folderName is found, set authentication state
      } else {
        setIsAuthenticated(false);  // If no folderName, keep the user on LoginScreen
      }
    } catch (error) {
      console.error('Error checking authentication:', error);
      setIsAuthenticated(false);  // Handle error and assume not authenticated
    }
  };

  checkAuthentication();  // Call the function to check authentication status
}, []);
  return (
    <NavigationContainer>
       <Stack.Navigator initialRouteName={isAuthenticated ? 'MainScreen' : 'LoginScreen'}>
        <Stack.Screen name="LoginScreen" component={LoginScreen} />
        <Stack.Screen name="MainScreen" component={MainScreen} options={{ title: 'Product Screen' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;
