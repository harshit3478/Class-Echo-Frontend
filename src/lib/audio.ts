export function formatAudioTime(totalSeconds: number | null | undefined) {
  if (totalSeconds == null || Number.isNaN(totalSeconds)) {
    return '0:00';
  }

  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function inferMimeTypeFromUri(fileUri: string, mimeType?: string | null) {
  const normalized = mimeType?.split(';')[0]?.trim().toLowerCase();
  if (normalized) {
    return normalized;
  }

  const ext = fileUri.split('.').pop()?.toLowerCase() ?? '';
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'mp3':
      return 'audio/mpeg';
    case 'wav':
      return 'audio/wav';
    case 'm4a':
      return 'audio/mp4';
    case 'ogg':
      return 'audio/ogg';
    case 'webm':
      return 'audio/webm';
    case 'aac':
      return 'audio/aac';
    default:
      return 'application/octet-stream';
  }
}

export function isAudioMimeType(mimeType: string) {
  return mimeType.startsWith('audio/');
}

export function buildWaveformBars(seed: number | string, count = 36) {
  let state = String(seed)
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 17);

  const bars: number[] = [];
  for (let index = 0; index < count; index += 1) {
    state = (state * 9301 + 49297) % 233280;
    const ratio = state / 233280;
    bars.push(0.18 + ratio * 0.82);
  }
  return bars;
}

export function normalizeMeteringValue(metering?: number) {
  if (metering == null || Number.isNaN(metering)) {
    return 0.16;
  }
  const clamped = Math.max(-60, Math.min(0, metering));
  return 0.18 + ((clamped + 60) / 60) * 0.82;
}
