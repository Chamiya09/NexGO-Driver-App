import * as DocumentPicker from 'expo-document-picker';

export type PickedDriverDocument = {
  uri: string;
  name: string;
  mimeType?: string;
};

const allowedDocumentTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'];

export async function pickDriverDocument(): Promise<PickedDriverDocument | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: allowedDocumentTypes,
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
    mimeType: asset.mimeType,
  };
}
