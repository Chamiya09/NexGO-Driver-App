import { API_BASE_URL } from '@/lib/api';

type UploadableFile = {
  uri: string;
  name?: string;
  mimeType?: string;
};

type UploadResponse = {
  fileUrl?: string;
  url?: string;
  secureUrl?: string;
  message?: string;
};

function inferFileName(uri: string) {
  const normalizedUri = uri.split('?')[0];
  const segments = normalizedUri.split('/');
  const lastSegment = segments[segments.length - 1];

  return lastSegment || `upload-${Date.now()}`;
}

function inferMimeType(fileName: string) {
  const extension = fileName.split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'heic':
      return 'image/heic';
    case 'heif':
      return 'image/heif';
    case 'pdf':
      return 'application/pdf';
    default:
      return 'application/octet-stream';
  }
}

export async function uploadFileToCloudinary({ uri, name, mimeType }: UploadableFile): Promise<string> {
  const fileName = name || inferFileName(uri);
  const fileType = mimeType || inferMimeType(fileName);
  const formData = new FormData();

  formData.append('file', {
    uri,
    name: fileName,
    type: fileType,
  } as unknown as Blob);

  const response = await fetch(`${API_BASE_URL}/upload`, {
    method: 'POST',
    body: formData,
  });

  const data = (await response.json().catch(() => ({}))) as UploadResponse;

  if (!response.ok) {
    throw new Error(data.message || 'File upload failed.');
  }

  const uploadedUrl = data.fileUrl || data.secureUrl || data.url;

  if (!uploadedUrl) {
    throw new Error('Upload completed, but no file URL was returned.');
  }

  return uploadedUrl;
}
