// MainFile.js
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Button,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
  Dimensions,
  ActivityIndicator,
  TextInput,
} from "react-native";
import * as XLSX from "xlsx";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as ImageManipulator from 'expo-image-manipulator';
import BarcodeScanner from './BarcodeScanner'; // Import the BarcodeScanner component
import AsyncStorage from '@react-native-async-storage/async-storage';  // For async storage
import LogoutButton from "./Logout";
import ImageScanner from "./ImageScanner";

const MAX_SIZE_KB = 50;

const MainFile = () => {
  const [data, setData] = useState([]);
  const [folderName, setFolderName] = useState(null);
  const [isImageModalVisible, setIsImageModalVisible] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState(null);
  const [loading, setLoading] = useState(false); 
  const [hasMediaLibraryPermission, setHasMediaLibraryPermission] = useState(null);
  const [scanningIndex, setScanningIndex] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isImage, setIsImage] = useState(false);
  const [isBarcodeModalVisible, setIsBarcodeModalVisible] = useState(false);
  const [currentEditingIndex, setCurrentEditingIndex] = useState(null);
  const [newBarcodeValue, setNewBarcodeValue] = useState("");

  const cameraRef = useRef(null);

  const deviceWidth = Dimensions.get("window").width;

  const handleScannedBarcode = (scannedData) => {
    if (scanningIndex !== null) {
      const updatedData = [...data];
      updatedData[scanningIndex].barcode = scannedData;
      setData(updatedData);
      setScanningIndex(null);
      setIsScanning(false);
    }
  };

  const compressImage = async (uri) => {
    try {
      let width = 800;
      let quality = 0.5;
      let resizedImage = null;
      const maxAttempts = 10;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        resizedImage = await ImageManipulator.manipulateAsync(
          uri,
          [{ resize: { width } }],
          { compress: quality, format: ImageManipulator.SaveFormat.JPEG, base64: true }
        );

        const base64 = resizedImage.base64;
        const base64Length = base64.length * (3/4) - (base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0);
        const sizeInKB = base64Length / 1024;
        
        if (sizeInKB <= MAX_SIZE_KB) {
          console.log(`Compressed under ${MAX_SIZE_KB}KB at width=${width}, quality=${quality}, size=${sizeInKB.toFixed(2)}KB`);
          return resizedImage;
        }

        width = Math.max(100, Math.floor(width / 2));
        quality = Math.max(0.1, quality - 0.1);
      }

      console.warn(`Could not get under ${MAX_SIZE_KB}KB after ${maxAttempts} attempts, returning smallest.`);
      return resizedImage;
    } catch (error) {
      console.error('Error compressing image:', error);
      throw error;
    }
  };

  const FetchAPIData = async () => {
    const storedFolderName = await AsyncStorage.getItem('folderName');
    console.log('effectFolder',storedFolderName);
    if (!storedFolderName) {
      Alert.alert("Error", "Folder name not found. Please set a folder name first.");
      return;
    }

    setLoading(true);
    const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    setHasMediaLibraryPermission(mediaStatus === "granted");

    try {
      const response = await fetch(
        "https://b09f8zu7hj.execute-api.us-east-1.amazonaws.com/default/notfoundproductslist?folderName=" + storedFolderName
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const apiData = await response.json();
      setLoading(false);

      if (!apiData.data || !apiData.headers) {
        throw new Error("Invalid API response format.");
      }

      const transformedData = apiData.data.map((item) => {
        const trimmedItem = {};
        Object.keys(item).forEach((key) => {
          const trimmedKey = key.trim(); 
          trimmedItem[trimmedKey] = item[key];
        });
      
        return {
          ...trimmedItem,
          image: trimmedItem.images ? trimmedItem.images : null,
          barcode: trimmedItem.barcode || null,
          frontImage: trimmedItem.frontImage ? trimmedItem.frontImage : null,
          backImage: trimmedItem.backImage ? trimmedItem.backImage : null,
        };
      });
      
      // Add an extra empty row for new data
      transformedData.push({
        barcode: '',
        frontImage: '',
        backImage: '',
        images: '',
      });

      setData(transformedData);
    } catch (error) {
      console.error("Error fetching data from API:", error);
      Alert.alert("Error", `Failed to fetch data: ${error.message}`);
      setLoading(false);
    }
  };

  useEffect(() => {
    const getFolderName = async () => {
      const storedFolderName = await AsyncStorage.getItem('folderName');
      setFolderName(storedFolderName || null);
    };
    getFolderName();
    FetchAPIData();
  }, []);

  const handleImagePress = (uri) => {
    setSelectedImageUri(uri);
    setIsImageModalVisible(true);
  };

  const handleImagePicker = async (index) => {
    if (!hasMediaLibraryPermission) {
      Alert.alert("Permission required", "Please grant media library access.");
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled) {
        const selectedImage = result.assets[0].uri;
        const compressedImage = await compressImage(selectedImage);

        const updatedData = [...data];
        updatedData[index].image = `data:image/jpeg;base64,${compressedImage.base64}`;
        setData(updatedData);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image.");
    }
  };

  const handleCloseScanner = () => {
    setIsScanning(false);
    setScanningIndex(null);
  };
  const handleCloseImage = () => {
    setIsImage(false);
    setScanningIndex(null);
  };

  const handleBarCodeScanned = ({ type, data: barcodeData }) => {
    if (scanningIndex !== null) {
      const updatedData = [...data];
      updatedData[scanningIndex].barcode = barcodeData;
      setData(updatedData);
      setScanningIndex(null);
      setIsScanning(false);
      Alert.alert("Barcode scanned", `Data: ${barcodeData}`);
    }
  };

  const handlePictureTaken = async (pictureBase64, type) => {
    try {
      const tempUri = FileSystem.cacheDirectory + 'tempImage.jpg';
      await FileSystem.writeAsStringAsync(tempUri, pictureBase64, { encoding: FileSystem.EncodingType.Base64 });
      
      const compressedImage = await compressImage(tempUri);

      if (scanningIndex !== null) {
        const updatedData = [...data];
        if (type === 'front') {
          updatedData[scanningIndex].frontImage = `data:image/jpeg;base64,${compressedImage.base64}`;
        } else if (type === 'back') {
          updatedData[scanningIndex].backImage = `data:image/jpeg;base64,${compressedImage.base64}`;
        }
        setData(updatedData);
      }
    } catch (error) {
      console.error("Error compressing scanned picture:", error);
      Alert.alert("Error", "Failed to compress scanned image.");
    }
  };

  const handleStartScanning = (index) => {
    setScanningIndex(index);
    setIsScanning(true);
  };
  const handleStartImage = (index) => {
    setScanningIndex(index);
    setIsImage(true);
  };

  const handleDownload = async () => {
    const path = `${FileSystem.cacheDirectory}data.xlsx`;

    try {
      const dataToExport = data.map(({ image, barcode, ...rest }) => ({
        ...rest,
        Image: image || "",
        Barcode: barcode || "",
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
      const xlsxData = XLSX.write(workbook, { type: "base64" });

      await FileSystem.writeAsStringAsync(path, xlsxData, {
        encoding: FileSystem.EncodingType.Base64,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(path);
      } else {
        Alert.alert("Error", "Sharing is not available on this device");
      }
    } catch (err) {
      console.error("Error saving file:", err.message);
      Alert.alert("Error", `Failed to save file: ${err.message}`);
    }
  };

  const captureImage = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.5,
          base64: false,
        });

        const compressedImage = await compressImage(photo.uri);

        const updatedData = [...data];
        updatedData[scanningIndex].image = `data:image/jpeg;base64,${compressedImage.base64}`;
        setData(updatedData);

        Alert.alert("Image Captured", "The image has been saved successfully.");
      } catch (error) {
        console.error("Error taking picture:", error);
        Alert.alert("Error", "Failed to take picture.");
      }
    }
  };

  const handleViewURLImage = (base64Image) => {
    setSelectedImageUri(base64Image);
    setIsImageModalVisible(true);
  };

  const handleUpdate = async (item, index) => {
    if (!folderName) {
      Alert.alert("Error", "Folder name not set.");
      return;
    }
  
    try {
      let frontBase64Image = "";
      if (item.frontImage) {
        const frontParts = item.frontImage.split(',');
        frontBase64Image = frontParts.length > 1 ? frontParts[1] : frontParts[0];
      }
  
      let backBase64Image = "";
      if (item.backImage) {
        const backParts = item.backImage.split(',');
        backBase64Image = backParts.length > 1 ? backParts[1] : backParts[0];
      }

      console.log('Updating row:', index+1, 'barcode:', item.barcode, 'frontImage size:', frontBase64Image.length, 'backImage size:', backBase64Image.length);
  
      const body = {
        folderName: folderName,
        row: (index + 1).toString(),
        barcode: item.barcode || "",
        frontImage: frontBase64Image || "",
        backImage: backBase64Image || "",
      };
  
      const response = await fetch(
        "https://b09f8zu7hj.execute-api.us-east-1.amazonaws.com/default/notfoundproductslist",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );
  
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      const responseData = await response.json();
      Alert.alert("Success", "Data updated successfully.");
      console.log("Update response:", responseData);
    } catch (error) {
      console.error("Error updating data:", error);
      Alert.alert("Error", `Failed to update data: ${error.message}`);
    }
  };
  

  const handleEditBarcode = (index) => {
    setCurrentEditingIndex(index);
    setNewBarcodeValue(data[index].barcode || "");
    setIsBarcodeModalVisible(true);
  };

  const handleBarcodeUpdate = () => {
    if (currentEditingIndex === null) {
      Alert.alert("Error", "No barcode selected for updating.");
      return;
    }

    if (!newBarcodeValue.trim()) {
      Alert.alert("Validation Error", "Barcode cannot be empty.");
      return;
    }

    const updatedData = [...data];
    updatedData[currentEditingIndex].barcode = newBarcodeValue;
    setData(updatedData);
    setIsBarcodeModalVisible(false);
    handleUpdate(updatedData[currentEditingIndex], currentEditingIndex);
  };

  const apiHeaders = [
    "Barcode",
    "Front Image",
    "Back Image",
    "Images",
    "Update", 
  ];

  const renderHeader = () => (
    <View style={styles.row}>
      {apiHeaders.map((header) => (
        <Text style={[styles.cell, styles.headerCell]} key={header}>
          {header}
        </Text>
      ))}
    </View>
  );

  const renderItem = ({ item, index }) => (
    <View style={styles.row}>
      {apiHeaders.slice(0, -5).map((key) => (
        <Text style={styles.cell} key={key}>
          {item[key]}
        </Text>
      ))}
      <View style={styles.cell}>
        {item.barcode ? (
          <TouchableOpacity onPress={() => handleEditBarcode(index)}>
            <Text>{item.barcode}</Text>
          </TouchableOpacity>
        ) : 
        <TouchableOpacity onPress={() => handleStartScanning(index)}>
          <Text style={styles.actionText}>Scan</Text>
        </TouchableOpacity>
        }
      </View>
      <View style={styles.cell}>
        {item.frontImage ? (
          <TouchableOpacity onPress={() => handleImagePress(item.frontImage)}>
            <Text style={styles.actionText}>View Front Image</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <View style={styles.cell}>
        {item.backImage ? (
          <TouchableOpacity onPress={() => handleImagePress(item.backImage)}>
            <Text style={styles.actionText}>View Back Image</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <View style={styles.cell}>
        <TouchableOpacity onPress={() => handleStartImage(index)}>
          <Text style={styles.actionText}>Scan</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.cell}>
        <TouchableOpacity onPress={() => handleUpdate(item, index)}>
          <Text style={styles.actionText}>Update</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Products Image</Text>
      <ScrollView horizontal>
        <FlatList
          data={data}
          keyExtractor={(item, index) => index.toString()}
          renderItem={renderItem}
          ListHeaderComponent={renderHeader}
        />
      </ScrollView>

      <Modal
        visible={isBarcodeModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsBarcodeModalVisible(false)}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Edit Barcode</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter new barcode"
              value={newBarcodeValue}
              onChangeText={setNewBarcodeValue}
              keyboardType="default"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.updateButton}
                onPress={handleBarcodeUpdate}
              >
                <Text style={styles.buttonText}>Update</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setIsBarcodeModalVisible(false)}
              >
                <Text style={styles.closeModalText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={isScanning} animationType="slide">
        <BarcodeScanner 
          onBarcodeScanned={handleScannedBarcode} 
          onClose={handleCloseScanner} 
          onPictureTaken={handlePictureTaken} 
        />

        <TouchableOpacity
          style={styles.closeScannerButton}
          onPress={() => {
            setIsScanning(false);
            setScanningIndex(null);
          }}
        >
          <Text style={styles.closeModalText}>Close Scanner</Text>
        </TouchableOpacity>
      </Modal>

      <Modal visible={isImage} animationType="slide">
        <ImageScanner 
          onClose={handleCloseImage} 
          onPictureTaken={handlePictureTaken} 
        />

        <TouchableOpacity
          style={styles.closeScannerButton}
          onPress={() => {
            setIsImage(false);
            setScanningIndex(null);
          }}
        >
          <Text style={styles.closeModalText}>Close Scanner</Text>
        </TouchableOpacity>
      </Modal>
      {loading && <ActivityIndicator style={styles.loadingIndicator} />}
      
      <Button title="Refresh" onPress={FetchAPIData} disabled={loading} />
      <LogoutButton/>

      <Modal
        visible={isImageModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsImageModalVisible(false)}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            {selectedImageUri && (
              <Image source={{ uri: selectedImageUri }} style={styles.fullImage} />
            )}
            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => setIsImageModalVisible(false)}
            >
              <Text style={styles.closeModalText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// Styles remain unchanged
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: "#fff",
  },
  row: {
    flexDirection: "row",
  },
  cell: {
    width: 120,
    padding: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCell: {
    backgroundColor: "#f0f0f0",
    fontWeight: "bold",
  },
  actionText: {
    color: "blue",
    textDecorationLine: "underline",
    marginTop: 5,
  },
  buttonText: {
    color: "#000",
    fontSize: 16,
  },
  modalBackground: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "80%",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
    alignItems: "center",
  },
  fullImage: {
    width: "100%",
    height: 300,
    resizeMode: "contain",
    marginBottom: 20,
  },
  closeModalButton: {
    backgroundColor: "#2196F3",
    padding: 10,
    borderRadius: 5,
  },
  closeModalText: {
    color: "#fff",
    fontSize: 16,
  },
  heading: {
    fontSize: 24,
    alignSelf: "center",
    margin: 30,
    fontWeight: "bold",
  },
  loadingIndicator: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginLeft: -25,
    marginTop: -25,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  textInput: {
    width: "100%",
    height: 40,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  updateButton: {
    backgroundColor: "#28a745",
    padding: 10,
    borderRadius: 5,
    flex: 1,
    marginRight: 5,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#dc3545",
    padding: 10,
    borderRadius: 5,
    flex: 1,
    marginLeft: 5,
    alignItems: "center",
  },
});

export default MainFile;
