import React, { useState, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

export default function ImageScanner({ onBarcodeScanned, onClose, onPictureTaken }) { // Added onPictureTaken prop
  const [permission, requestPermission] = useCameraPermissions();
  const [isBarcodeMode, setIsBarcodeMode] = useState(true); // Set to true by default
  const cameraRef = useRef(null);
  const zoom = 0; // You can adjust the zoom level as needed (0 to 1)

  // Handle cases where camera permissions are loading
  if (!permission) {
    return <View />;
  }

  // Request camera permissions if not granted
  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.message}>We need your permission to access the camera.</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  /**
   * Handler function that gets called when a barcode is scanned.
   * Logs the type and data of the scanned barcode to the console.
   *
   * @param {Object} barcode - The barcode object containing type and data.
   * @param {string} barcode.type - The type of the barcode (e.g., QR, EAN13).
   * @param {string} barcode.data - The data encoded in the barcode.
   */
  const handleBarcodeScanned = ({ type, data }) => {
    console.log(`Barcode scanned! Type: ${type}, Data: ${data}`);
    if (onBarcodeScanned) {
      onBarcodeScanned(data); // Invoke the callback with scanned data
    }
    setIsBarcodeMode(false); // Disable barcode mode after scanning
  };

  /**
   * Handler function to take a picture.
   * Captures the image in Base64 format and passes it to the parent component.
   */
  
  const handleFrontPicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({ base64: true });
        console.log('Picture taken:', photo.uri);
        if (onPictureTaken) {
          onPictureTaken(photo.base64, 'front');
        }
        // Alert.alert("Picture Taken", "Your picture has been captured successfully.");
      } catch (error) {
        console.error('Error taking picture:', error);
        Alert.alert('Error', 'Failed to take picture.');
      }
    } else {
      Alert.alert('Error', 'Camera is not ready.');
    }
  };

  const handleTakePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({ base64: true });
        console.log('Picture taken:', photo.uri);
        if (onPictureTaken) {
          onPictureTaken(photo.base64, 'back');
        }
        // Alert.alert("Picture Taken", "Your picture has been captured successfully.");
      } catch (error) {
        console.error('Error taking picture:', error);
        Alert.alert('Error', 'Failed to take picture.');
      }
    } else {
      Alert.alert('Error', 'Camera is not ready.');
    }
  };

  return (
    <View style={styles.container}>
      {/* Close Button */}
      <TouchableOpacity style={styles.closeButton} onPress={onClose}>
        <Text style={styles.closeButtonText}>✕</Text> {/* You can use an icon instead */}
      </TouchableOpacity>

      {/* Camera View */}
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        zoom={zoom}
        // Specify the types of barcodes you want to scan
        barcodeScannerSettings={{
          barcodeTypes: [
            "ean13",
            "ean8",
            "aztec",
            "upc_a",
            "datamatrix",
            "upc_e"
          ],
        }}
        // Attach the handler function if barcode mode is enabled
        // onBarcodeScanned={isBarcodeMode ? handleBarcodeScanned : undefined}
      />
      
      {/* Scanning Indicator */}
      {/* {isBarcodeMode && (
        <View style={styles.scanningIndicator}>
          <Text style={styles.scanningText}>Scanning for barcodes...</Text>
        </View>
      )} */}

      {/* Take Picture Button */}
      <TouchableOpacity style={styles.takePictureButton} onPress={handleTakePicture}>
        <Text style={styles.takePictureButtonText}>Back Picture</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.takeFrontButton} onPress={handleFrontPicture}>
        <Text style={styles.takePictureButtonText}>Front Picture</Text>
      </TouchableOpacity>
    </View>
  );
}

// Styles for the BarcodeScanner component
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    position: 'relative', // Ensure the close button is positioned correctly
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    textAlign: 'center',
    paddingBottom: 10,
    fontSize: 16,
  },
  permissionButton: {
    backgroundColor: '#1E90FF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  camera: {
    flex: 1,
  },
  scanningIndicator: {
    position: 'absolute',
    top: 50,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 10,
    borderRadius: 5,
  },
  scanningText: {
    color: 'white',
    fontSize: 16,
  },
  closeButton: {
    position: 'absolute',
    top: 40, // Adjust as needed
    right: 20, // Adjust as needed
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 10,
    borderRadius: 20,
    zIndex: 1, // Ensure the button is above the camera view
  },
  closeButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  takePictureButton: {
    position: 'absolute',
     bottom: 30, // Position the button above the bottom
    alignSelf: 'center',
    backgroundColor: '#28a745',
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 8,
  },

  takeFrontButton:{
    position: 'absolute',
    bottom: 100, // Position the button above the bottom
    alignSelf: 'center',
    backgroundColor: '#28a745',
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 8,
  },
  takePictureButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
