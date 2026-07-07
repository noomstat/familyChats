// Voice message recording — a thin wrapper over expo-av's Audio.Recording.
// Records at the HIGH_QUALITY preset (.m4a on iOS/Android, .webm on web via
// MediaRecorder) and hands back a local file uri + elapsed duration. Nothing
// here throws: permission/setup/stop failures are logged and surfaced as
// null/false so the composer can show an inline warning instead of crashing.
import { Audio } from 'expo-av';

let activeRecording: Audio.Recording | null = null;
let activeStartedAt = 0;

export interface RecordingResult {
  /** Local file:// (native) or blob:/data: (web) uri of the finished clip. */
  uri: string;
  durationMs: number;
}

/** Asks for microphone permission. Resolves false (never throws) if denied or unavailable. */
export async function requestPermissions(): Promise<boolean> {
  try {
    const { granted } = await Audio.requestPermissionsAsync();
    return granted;
  } catch (err) {
    console.warn('[voiceRecorder] permission request failed', err);
    return false;
  }
}

/**
 * Starts a new recording. Returns false (and logs, never throws) if one is
 * already in progress or the platform rejects setup (no mic, permission
 * revoked mid-flow, etc).
 */
export async function startRecording(): Promise<boolean> {
  if (activeRecording) return false;
  try {
    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
    const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
    activeRecording = recording;
    activeStartedAt = Date.now();
    return true;
  } catch (err) {
    console.warn('[voiceRecorder] startRecording failed', err);
    activeRecording = null;
    return false;
  }
}

/**
 * Stops the in-progress recording and returns its local uri + elapsed
 * duration, or null if nothing was recording or it failed.
 */
export async function stopRecording(): Promise<RecordingResult | null> {
  const recording = activeRecording;
  if (!recording) return null;
  activeRecording = null;
  const durationMs = Date.now() - activeStartedAt;
  try {
    await recording.stopAndUnloadAsync();
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false }).catch(() => {});
    const uri = recording.getURI();
    if (!uri) return null;
    return { uri, durationMs };
  } catch (err) {
    console.warn('[voiceRecorder] stopRecording failed', err);
    return null;
  }
}

/** Cancels the in-progress recording without returning a result — no upload follows. */
export async function cancelRecording(): Promise<void> {
  const recording = activeRecording;
  if (!recording) return;
  activeRecording = null;
  try {
    await recording.stopAndUnloadAsync();
  } catch (err) {
    console.warn('[voiceRecorder] cancelRecording failed', err);
  }
  await Audio.setAudioModeAsync({ allowsRecordingIOS: false }).catch(() => {});
}

const MIME_BY_EXT: Record<string, string> = {
  m4a: 'audio/m4a',
  mp4: 'audio/mp4',
  webm: 'audio/webm',
  wav: 'audio/wav',
  aac: 'audio/aac',
};

/** Guesses an upload {name, mimeType} from the recorded uri's file extension. */
export function fileInfoFromUri(uri: string): { name: string; mimeType: string } {
  const ext = (uri.split('?')[0].split('.').pop() || 'm4a').toLowerCase();
  const mimeType = MIME_BY_EXT[ext] ?? 'audio/m4a';
  return { name: `voice-${Date.now()}.${ext}`, mimeType };
}
