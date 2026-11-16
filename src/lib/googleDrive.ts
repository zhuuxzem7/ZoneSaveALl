export class DriveAuthExpiredError extends Error {
  constructor(message = 'Sesi izin Google Drive telah berakhir. Hubungkan ulang akun Google Anda.') {
    super(message);
    this.name = 'DriveAuthExpiredError';
  }
}

export type DriveMediaFileType = 'mp4' | 'mp3' | 'jpg';

export interface SaveToDriveParams {
  accessToken: string;
  mediaUrl: string;
  filename: string;
  fileType: DriveMediaFileType;
  folderName: string;
  apiBase?: string;
  description?: string;
  onProgress?: (stage: 'downloading' | 'uploading', percent?: number) => void;
}

export interface SaveToDriveResult {
  id: string;
  name: string;
  folderName: string;
  webViewLink: string;
}

function getMimeType(fileType: DriveMediaFileType, headerType?: string | null): string {
  if (fileType === 'mp3') return 'audio/mpeg';
  if (fileType === 'jpg') {
    if (headerType && headerType.startsWith('image/')) return headerType.split(';')[0];
    return 'image/jpeg';
  }
  if (headerType && headerType.startsWith('video/')) return headerType.split(';')[0];
  return 'video/mp4';
}

function sanitizeDriveName(raw: string, fallback: string): string {
  const cleaned = raw
    .replace(/[\r\n\t<>:"/\\|?*]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
  return cleaned || fallback;
}

async function parseDriveErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const json = (await res.json()) as {
      error?: { message?: string; status?: string };
    };
    if (json?.error?.message) {
      return json.error.message;
    }
  } catch {
    // ignore json parse failure
  }
  return fallback;
}

export async function findOrCreateDriveFolder(
  accessToken: string,
  rawFolderName: string
): Promise<{ id: string; name: string }> {
  const folderName = sanitizeDriveName(rawFolderName, 'ZoneSaveALL');
  const escaped = folderName.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const query = `mimeType='application/vnd.google-apps.folder' and name='${escaped}' and trashed=false`;

  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
      query
    )}&fields=files(id,name)&spaces=drive&pageSize=1`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (searchRes.status === 401) {
    throw new DriveAuthExpiredError();
  }

  if (searchRes.ok) {
    const searchJson = (await searchRes.json()) as {
      files?: Array<{ id?: string; name?: string }>;
    };
    const existing = searchJson.files?.[0];
    if (existing?.id) {
      return {
        id: existing.id,
        name: existing.name || folderName,
      };
    }
  } else if (searchRes.status === 403) {
    const errMsg = await parseDriveErrorMessage(
      searchRes,
      'Akses ke Google Drive ditolak. Pastikan izin Google Drive dicentang saat login.'
    );
    throw new Error(errMsg);
  }

  const createRes = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });

  if (createRes.status === 401) {
    throw new DriveAuthExpiredError();
  }

  if (!createRes.ok) {
    const errMsg = await parseDriveErrorMessage(
      createRes,
      `Gagal membuat folder "${folderName}" di Google Drive (HTTP ${createRes.status}).`
    );
    throw new Error(errMsg);
  }

  const created = (await createRes.json()) as { id?: string; name?: string };
  if (!created.id) {
    throw new Error('Google Drive tidak mengembalikan ID folder baru.');
  }

  return {
    id: created.id,
    name: created.name || folderName,
  };
}

function uploadBlobWithProgress(
  uploadUrl: string,
  blob: Blob,
  mimeType: string,
  onProgress?: (percent: number) => void
): Promise<{ id?: string; name?: string; webViewLink?: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl, true);
    xhr.setRequestHeader('Content-Type', mimeType);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        const pct = Math.min(99, Math.max(1, Math.round((event.loaded / event.total) * 100)));
        onProgress?.(pct);
      }
    };

    xhr.onload = () => {
      if (xhr.status === 401) {
        reject(new DriveAuthExpiredError());
        return;
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const parsed = JSON.parse(xhr.responseText || '{}') as {
            id?: string;
            name?: string;
            webViewLink?: string;
          };
          onProgress?.(100);
          resolve(parsed);
        } catch {
          reject(new Error('Respons Google Drive tidak valid setelah upload selesai.'));
        }
        return;
      }
      reject(new Error(`Gagal mengunggah file ke Google Drive (HTTP ${xhr.status}).`));
    };

    xhr.onerror = () => {
      reject(new Error('Koneksi terputus saat mengunggah ke Google Drive.'));
    };

    xhr.send(blob);
  });
}

export async function saveMediaToGoogleDrive(
  params: SaveToDriveParams
): Promise<SaveToDriveResult> {
  const {
    accessToken,
    mediaUrl,
    filename,
    fileType,
    folderName,
    apiBase = '',
    description,
    onProgress,
  } = params;

  if (!accessToken) {
    throw new DriveAuthExpiredError();
  }
  if (!mediaUrl) {
    throw new Error('URL media tidak tersedia untuk disimpan ke Google Drive.');
  }

  onProgress?.('downloading', 10);

  const normalizedBase = apiBase.replace(/\/$/, '');
  const proxyUrl = `${normalizedBase}/api/download?url=${encodeURIComponent(
    mediaUrl
  )}&filename=${encodeURIComponent(filename)}&type=${fileType}&inline=1`;

  let mediaResponse = await fetch(proxyUrl);
  if (!mediaResponse.ok) {
    mediaResponse = await fetch(mediaUrl);
  }

  if (!mediaResponse.ok) {
    throw new Error(`Gagal mengambil file media untuk diunggah (HTTP ${mediaResponse.status}).`);
  }

  const contentType = mediaResponse.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    throw new Error('Media sumber mengembalikan pesan error, bukan file video/audio.');
  }

  const blob = await mediaResponse.blob();
  if (!blob || blob.size === 0) {
    throw new Error('Ukuran file media kosong (0 byte).');
  }

  const mimeType = getMimeType(fileType, blob.type || contentType);
  const ext = `.${fileType}`;
  const cleanFilename = sanitizeDriveName(filename, 'zonesaveall_media');
  const finalFilename = cleanFilename.toLowerCase().endsWith(ext)
    ? cleanFilename
    : `${cleanFilename}${ext}`;

  onProgress?.('uploading', 5);

  const folder = await findOrCreateDriveFolder(accessToken, folderName || 'ZoneSaveALL');

  const initRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': mimeType,
        'X-Upload-Content-Length': String(blob.size),
      },
      body: JSON.stringify({
        name: finalFilename,
        parents: [folder.id],
        description: description || 'Disimpan dari ZoneSaveALL',
      }),
    }
  );

  if (initRes.status === 401) {
    throw new DriveAuthExpiredError();
  }

  if (!initRes.ok) {
    const errMsg = await parseDriveErrorMessage(
      initRes,
      `Gagal memulai sesi upload Google Drive (HTTP ${initRes.status}).`
    );
    throw new Error(errMsg);
  }

  const uploadLocation = initRes.headers.get('Location');
  if (!uploadLocation) {
    throw new Error('Google Drive tidak memberikan URL sesi upload.');
  }

  const uploaded = await uploadBlobWithProgress(uploadLocation, blob, mimeType, (pct) =>
    onProgress?.('uploading', pct)
  );

  const fileId = uploaded.id || '';
  const webViewLink =
    uploaded.webViewLink ||
    (fileId ? `https://drive.google.com/file/d/${fileId}/view` : 'https://drive.google.com');

  return {
    id: fileId,
    name: uploaded.name || finalFilename,
    folderName: folder.name,
    webViewLink,
  };
}
