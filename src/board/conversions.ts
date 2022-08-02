export function convertAudioBuffer(source: number, target: AudioBuffer) {
  const channel = target.getChannelData(0);
  const heap = window.HEAPU8;
  for (let i = 0; i < channel.length; ++i) {
    // Convert from uint8 to -1..+1 float.
    channel[i] = (heap[source + i] / 255) * 2 - 1;
  }
  return target;
}
