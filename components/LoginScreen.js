import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';  // For async storage
import { useNavigation } from '@react-navigation/native';  // For navigation

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const navigation = useNavigation();

  useEffect(() => {
    // Fetch the data from the API
    fetch('https://cms.vervebot.io/productlinkingcred.json')
      .then(response => response.json())
      .then(responseData => {
        setData(responseData);
        setIsLoading(false);
        console.log('Fetched Data:', responseData); // Log the full response
      })
      .catch(error => {
        setIsLoading(false);
        setError('Error fetching data');
        console.error('Error fetching data:', error);
      });
  }, []);

  // Handle login logic
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    // Extract the domain from the email (e.g., "info@vervebot.io" => "vervebot.io")
    const emailDomain = email.split('@')[1];
    if (!emailDomain) {
      Alert.alert('Error', 'Invalid email format');
      return;
    }

    // Check if the data is loaded
    if (!data || data.length === 0) {
      Alert.alert('Error', 'No login data available');
      return;
    }

    // Access the first element of the array, which contains the domains
    const domainData = data[0];
    const availableDomains = Object.keys(domainData);

    console.log('Available domains:', availableDomains);

    // Check if the domain exists in the API data
    if (!availableDomains.includes(emailDomain)) {
      Alert.alert('Error', `Domain ${emailDomain} not found`);
      return;
    }

    const domainDetails = domainData[emailDomain];
    console.log('Domain Data:', domainDetails);

    // Check if the email and password match
    let isValid = false;
    let folderName = '';

    domainDetails.forEach(item => {
      for (const key in item) {
        const [storedEmail, storedPassword, storedFolderName] = item[key].split(',');
        if (storedEmail === email && storedPassword === password) {
          isValid = true;
          folderName = storedFolderName;
        }
      }
    });

    if (isValid) {
      // Store the folder name in AsyncStorage
      await AsyncStorage.setItem('folderName', folderName);
      Alert.alert('Success', 'Login successful');
      navigation.navigate('MainScreen');  // Navigate to MainScreen
    } else {
      Alert.alert('Error', 'Invalid email or password');
    }
  };

  if (isLoading) {
    return (
      <View>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View>
        <Text>{error}</Text>
      </View>
    );
  }

  return (
    <View style={{ padding: 20 }}>
      <Text>Email</Text>
      <TextInput
        style={{ height: 40, borderColor: 'gray', borderWidth: 1, marginBottom: 10, paddingLeft: 10 }}
        placeholder="Enter your email"
        value={email}
        onChangeText={setEmail}
      />

      <Text>Password</Text>
      <TextInput
        style={{ height: 40, borderColor: 'gray', borderWidth: 1, marginBottom: 20, paddingLeft: 10 }}
        placeholder="Enter your password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <Button title="Login" onPress={handleLogin} />
    </View>
  );
};

export default LoginScreen;
