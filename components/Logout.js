import React from 'react';
import { Button, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage'; // For AsyncStorage
import { useNavigation } from '@react-navigation/native'; // For navigation

const LogoutButton = () => {
  const navigation = useNavigation(); // Get access to navigation

  const handleLogout = async () => {
    try {
      // Remove folderName from AsyncStorage
      await AsyncStorage.removeItem('folderName');
      console.log('User logged out');

      // Navigate back to LoginScreen after logout
      navigation.replace('LoginScreen'); // Use replace to avoid going back to the main screen after logging out
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Button title="Logout" onPress={handleLogout} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    alignItems: 'center',
  },
});

export default LogoutButton;
