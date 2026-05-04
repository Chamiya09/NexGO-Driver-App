import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

export type PickedDriverDocument = {
  uri: string;
  name: string;
  mimeType?: string;
};

export async function pickDriverPdf(): Promise<PickedDriverDocument | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/pdf',
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled || result.assets.length === 0) {
    return null;
  }

  const asset = result.assets[0];

  return {
    uri: asset.uri,
    name: asset.name || `driver-document-${Date.now()}`,
    mimeType: asset.mimeType || 'application/pdf',
  };
}

export async function pickDriverImage(): Promise<PickedDriverDocument | null> {
  const permission = await ImagePicker.getMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Photo library permission is required to upload an image.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.85,
    allowsEditing: false,
  });

  if (result.canceled || result.assets.length === 0) {
    return null;
  }

  const asset = result.assets[0];

  return {
    uri: asset.uri,
    name: asset.fileName || `driver-document-${Date.now()}.jpg`,
    mimeType: asset.mimeType || 'image/jpeg',
  };
}

export async function captureDriverDocumentImage(): Promise<PickedDriverDocument | null> {
  const permission = await ImagePicker.getCameraPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Camera permission is required to take a document photo.');
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    quality: 0.85,
    allowsEditing: false,
  });

  if (result.canceled || result.assets.length === 0) {
    return null;
  }

  const asset = result.assets[0];

  return {
    uri: asset.uri,
    name: asset.fileName || `driver-document-camera-${Date.now()}.jpg`,
    mimeType: asset.mimeType || 'image/jpeg',
  };
}
