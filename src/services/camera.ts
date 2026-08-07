import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { newId } from '@/data/record';

const MAX_DIMENSION = 1280;
const PHOTO_QUALITY = 0.7;

async function ensurePhotoDir(): Promise<string> {
  const dir = `${FileSystem.documentDirectory}photos/`;
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
  return dir;
}

async function compressAndStore(sourceUri: string, sourceWidth: number): Promise<string> {
  const actions = sourceWidth > MAX_DIMENSION ? [{ resize: { width: MAX_DIMENSION } }] : [];
  const manipulated = await manipulateAsync(sourceUri, actions, {
    compress: PHOTO_QUALITY,
    format: SaveFormat.JPEG,
  });
  const dir = await ensurePhotoDir();
  const dest = `${dir}${newId()}.jpg`;
  await FileSystem.copyAsync({ from: manipulated.uri, to: dest });
  return dest;
}

export async function capturePhoto(): Promise<string | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Camera permission is required to add job photos.');
  }
  const result = await ImagePicker.launchCameraAsync({ quality: 1 });
  const asset = result.assets?.[0];
  if (result.canceled || !asset) {
    return null;
  }
  return compressAndStore(asset.uri, asset.width);
}

export async function pickPhotoFromLibrary(): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Photo library permission is required.');
  }
  const result = await ImagePicker.launchImageLibraryAsync({ quality: 1 });
  const asset = result.assets?.[0];
  if (result.canceled || !asset) {
    return null;
  }
  return compressAndStore(asset.uri, asset.width);
}
