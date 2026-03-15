/**
 * Properly concatenate multiple video blobs into a single playable video
 * using Canvas + MediaRecorder to re-encode sequentially.
 */

import { isGoogleApiUrl, fetchVideoViaProxy, fetchVideoAsBlob } from './video-proxy';

/**
 * Download a video URL to a blob URL suitable for <video> playback
 */
async function toBlobUrl(url: string): Promise<string> {
  if (url.startsWith('blob:')) return url;
  if (isGoogleApiUrl(url)) {
    return await fetchVideoViaProxy(url);
  }
  const blob = await fetchVideoAsBlob(url);
  return URL.createObjectURL(blob);
}

/**
 * Concatenate multiple video URLs into a single video blob.
 * Uses an offscreen canvas + MediaRecorder to properly re-encode.
 */
export async function concatenateVideos(
  videoUrls: string[],
  onProgress?: (current: number, total: number) => void
): Promise<Blob> {
  if (videoUrls.length === 0) throw new Error('No videos to concatenate');
  if (videoUrls.length === 1) {
    // Single video — just return the blob directly
    const blob = await fetchVideoAsBlob(videoUrls[0]);
    return blob;
  }

  // First, convert all URLs to playable blob URLs
  const blobUrls = await Promise.all(videoUrls.map(toBlobUrl));

  // Pre-load all videos to get dimensions from the first one
  const firstVideo = document.createElement('video');
  firstVideo.src = blobUrls[0];
  firstVideo.muted = true;
  firstVideo.playsInline = true;
  await new Promise<void>((resolve, reject) => {
    firstVideo.onloadedmetadata = () => resolve();
    firstVideo.onerror = () => reject(new Error('Failed to load first video'));
  });

  const width = firstVideo.videoWidth || 1080;
  const height = firstVideo.videoHeight || 1920;

  // Create offscreen canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Set up MediaRecorder on the canvas stream
  const stream = canvas.captureStream(30); // 30fps
  
  // Try to use a good codec, fall back gracefully
  let mimeType = 'video/webm;codecs=vp9';
  if (!MediaRecorder.isTypeSupported(mimeType)) {
    mimeType = 'video/webm;codecs=vp8';
  }
  if (!MediaRecorder.isTypeSupported(mimeType)) {
    mimeType = 'video/webm';
  }

  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 8_000_000, // 8Mbps for good quality
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  recorder.start(100); // collect data every 100ms

  // Play each video sequentially, drawing frames to canvas
  for (let i = 0; i < blobUrls.length; i++) {
    onProgress?.(i, blobUrls.length);

    const video = document.createElement('video');
    video.src = blobUrls[i];
    video.muted = true;
    video.playsInline = true;

    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve();
      video.onerror = () => reject(new Error(`Failed to load video ${i + 1}`));
    });

    // Draw loop — paint video frames to canvas until the video ends
    await new Promise<void>((resolve) => {
      video.onended = () => resolve();

      const drawFrame = () => {
        if (video.paused || video.ended) return;
        ctx.drawImage(video, 0, 0, width, height);
        requestAnimationFrame(drawFrame);
      };

      video.play().then(() => {
        drawFrame();
      }).catch(() => resolve()); // skip if autoplay blocked
    });
  }

  onProgress?.(blobUrls.length, blobUrls.length);

  // Stop recording and collect the final blob
  return new Promise<Blob>((resolve) => {
    recorder.onstop = () => {
      const finalBlob = new Blob(chunks, { type: mimeType });
      resolve(finalBlob);
    };
    recorder.stop();
  });
}
