// Helper to lazy-load and initialize voice-activity-detection for browser
// This is separated to avoid SSR issues in Next.js

export async function getVAD() {
  if (typeof window === 'undefined') return null;
  // @ts-ignore
  const vad = (await import('voice-activity-detection')).default;
  return vad;
}
