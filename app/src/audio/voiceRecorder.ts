// Voice message recording — a thin wrapper over expo-av's Audio.Recording.
// Records at the HIGH_QUALITY preset (.m4a on iOS/Android; on web, webm via
// MediaRecorder by default — except Safari, which can record audio/mp4
// directly, and iOS's own AV stack can't play back webm at all. Preferring
// mp4 on web whenever the browser supports it closes that cross-platform gap;
// Chrome/Firefox still fall back to webm since they don't support mp4 capture.
// Hands back a local file uri + elapsed duration. Nothing here throws:
// permission/setup/stop failures are logged and surfaced as null/false so the
// composer can show an inline warning instead of crashing.
import { Platform } from 'react-native';
import { Audio } from 'expo-av';

let activeRecording: Audio.Recording | null = null;
let activeStartedAt = 0;

/** HIGH_QUALITY, but on web prefers audio/mp4 over the default webm when the browser's MediaRecorder can actually produce it (Safari yes; Chrome/Firefox no, so they keep webm). */
function recordingOptions(): Audio.RecordingOptions {
  const preset = Audio.RecordingOptionsPresets.HIGH_QUALITY;
  if (Platform.OS !== 'web') return preset;
  const canRecordMp4 =
    typeof MediaRecorder !== 'undefined' &&
    typeof MediaRecorder.isTypeSupported === 'function' &&
    MediaRecorder.isTypeSupported('audio/mp4');
  if (!canRecordMp4) return preset;
  return { ...preset, web: { ...preset.web, mimeType: 'audio/mp4' } };
}

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
    const { recording } = await Audio.Recording.createAsync(recordingOptions());
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
