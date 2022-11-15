from microbit import *

# Create a Sound Effect and immediately play it
audio.play(
    audio.SoundEffect(
        freq_start=400,
        freq_end=2000,
        duration=500,
        vol_start=100,
        vol_end=255,
        waveform=audio.SoundEffect.WAVEFORM_TRIANGLE,
        fx=audio.SoundEffect.FX_VIBRATO,
        shape=audio.SoundEffect.SHAPE_LOG,
    )
)
