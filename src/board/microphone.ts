import {
  MICROBIT_HAL_MICROPHONE_EVT_THRESHOLD_HIGH,
  MICROBIT_HAL_MICROPHONE_EVT_THRESHOLD_LOW,
} from "./constants";
import { RangeSensor, State } from "./state";

type SoundLevelCallback = (v: number) => void;

export class Microphone {
  public soundLevel: RangeSensor = new RangeSensor(
    "soundLevel",
    0,
    255,
    0,
    undefined,
    75,
    150
  );
  private soundLevelCallback: SoundLevelCallback | undefined;
  private _isRecording: boolean = false;

  constructor(
    private element: SVGElement,
    private onChange: (changes: Partial<State>) => void
  ) {}

  microphoneOn() {
    this.element.style.display = "unset";
  }

  private microphoneOff() {
    this.element.style.display = "none";
  }

  setThreshold(threshold: "low" | "high", value: number) {
    const proposed = value > 255 ? 255 : value < 0 ? 0 : value;
    if (threshold === "low") {
      this.soundLevel.lowThreshold = proposed;
    } else {
      this.soundLevel.highThreshold = proposed;
    }
    this.onChange({
      soundLevel: this.soundLevel,
    });
  }

  setValue(value: number) {
    const prev = this.soundLevel.value;
    const curr = value;
    this.soundLevel.value = value;

    const low = this.soundLevel.lowThreshold!;
    const high = this.soundLevel.highThreshold!;
    if (this.soundLevelCallback) {
      if (prev > low && curr <= low) {
        this.soundLevelCallback(MICROBIT_HAL_MICROPHONE_EVT_THRESHOLD_LOW);
      } else if (prev < high && curr >= high!) {
        this.soundLevelCallback(MICROBIT_HAL_MICROPHONE_EVT_THRESHOLD_HIGH);
      }
    }
  }

  initializeCallbacks(soundLevelCallback: (v: number) => void) {
    this.soundLevelCallback = soundLevelCallback;
  }

  boardStopped() {
    this.microphoneOff();
  }

  isRecording() {
    return this._isRecording;
  }

  stopRecording() {
    // TODO
  }

  async startRecording(onChunk: (chunk: ArrayBuffer) => void) {
    if (!navigator?.mediaDevices?.getUserMedia) {
      return;
    }
    if (this.isRecording()) {
      this.stopRecording();
      // Wait for it if needed
    }
    this._isRecording = true;

    // This might not be the right recording approach as we want 8 bit PCM for AudioFrame
    // and we're getting a fancy codec.
    let mediaRecorder: MediaRecorder | undefined;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: true,
      });
      mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.start();

      setTimeout(() => {
        if (mediaRecorder) {
          mediaRecorder.stop();
        }
      }, 5000);

      mediaRecorder.ondataavailable = async (e: BlobEvent) => {
        const buffer = await e.data.arrayBuffer();
        onChunk(buffer);
      };
      mediaRecorder.onstop = async () => {
        this._isRecording = false;
      };
    } catch (error) {
      if (mediaRecorder) {
        mediaRecorder.stop();
      }
      this._isRecording = false;
    }
  }
}
