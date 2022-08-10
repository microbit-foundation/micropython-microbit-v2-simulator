/**
 * Adapted from Microsoft MakeCode's conversion of the CODAL synthesizer.
 * Copyright (c) Microsoft Corporation
 * SPDX-License-Identifier: MIT
 *
 * https://github.com/microsoft/pxt/blob/41530725a3d70f67ee4e501066c701e7a0c20ff6/pxtsim/sound/soundexpression.ts
 */

import { Progression } from "./musical-progressions";
import {
  EMOJI_SYNTHESIZER_TONE_EFFECTS,
  SoundEmojiSynthesizer,
} from "./sound-emoji-synthesizer";
import * as SoundSynthesizerEffects from "./sound-synthesizer-effects";
import * as Synthesizer from "./sound-synthesizer";
import * as MusicalProgressions from "./musical-progressions";

/**
 * Adapted from lancaster-university/codal-microbit-v2
 * https://github.com/lancaster-university/codal-microbit-v2/blob/master/source/SoundExpressions.cpp
 */
export function parseSoundEffects(notes: string) {
  // https://github.com/lancaster-university/codal-microbit-v2/blob/master/source/SoundExpressions.cpp#L57

  // 72 characters of sound data comma separated
  const charsPerEffect = 72;
  const effectCount = Math.floor((notes.length + 1) / (charsPerEffect + 1));
  const expectedLength = effectCount * (charsPerEffect + 1) - 1;
  if (notes.length != expectedLength) {
    return [];
  }

  const soundEffects: SoundEffect[] = [];

  for (let i = 0; i < effectCount; ++i) {
    const start = i * charsPerEffect + i;
    if (start > 0 && notes[start - 1] != ",") {
      return [];
    }
    const effect = blankSoundEffect();
    if (!parseSoundExpression(notes.substr(start), effect)) {
      return [];
    }
    soundEffects.push(effect);
  }

  return soundEffects;
}

export interface TonePrint {
  tonePrint: (arg: number[], position: number) => number;
  parameter: number[];
}

export interface ToneEffect {
  effect: (synth: SoundEmojiSynthesizer, context: ToneEffect) => void;
  step: number;
  steps: number;
  parameter: number[];
  parameter_p: Progression[];
}

export interface SoundEffect {
  frequency: number;
  volume: number;
  duration: number;
  tone: TonePrint;
  effects: ToneEffect[];
}

export function parseSoundExpression(soundChars: string, fx: SoundEffect) {
  // https://github.com/lancaster-university/codal-microbit-v2/blob/master/source/SoundExpressions.cpp#L115

  // Encoded as a sequence of zero padded decimal strings.
  // This encoding is worth reconsidering if we can!
  // The ADSR effect (and perhaps others in future) has two parameters which cannot be expressed.

  // 72 chars total
  //  [0] 0-4 wave
  let wave = parseInt(soundChars.substr(0, 1));
  //  [1] 0000-1023 volume
  let effectVolume = parseInt(soundChars.substr(1, 4));
  //  [5] 0000-9999 frequency
  let frequency = parseInt(soundChars.substr(5, 4));
  //  [9] 0000-9999 duration
  let duration = parseInt(soundChars.substr(9, 4));
  // [13] 00 shape (specific known values)
  let shape = parseInt(soundChars.substr(13, 2));
  // [15] XXX unused/bug. This was startFrequency but we use frequency above.
  // [18] 0000-9999 end frequency
  let endFrequency = parseInt(soundChars.substr(18, 4));
  // [22] XXXX unused. This was start volume but we use volume above.
  // [26] 0000-1023 end volume
  let endVolume = parseInt(soundChars.substr(26, 4));
  // [30] 0000-9999 steps
  let steps = parseInt(soundChars.substr(30, 4));
  // [34] 00-03 fx choice
  let fxChoice = parseInt(soundChars.substr(34, 2));
  // [36] 0000-9999 fxParam
  let fxParam = parseInt(soundChars.substr(36, 4));
  // [40] 0000-9999 fxnSteps
  let fxnSteps = parseInt(soundChars.substr(40, 4));

  // Details that encoded randomness to be applied when frame is used:
  // Can the randomness cause any parameters to go out of range?
  // [44] 0000-9999 frequency random
  frequency = applyRandom(frequency, parseInt(soundChars.substr(44, 4)));
  // [48] 0000-9999 end frequency random
  endFrequency = applyRandom(endFrequency, parseInt(soundChars.substr(48, 4)));
  // [52] 0000-9999 volume random
  effectVolume = applyRandom(effectVolume, parseInt(soundChars.substr(52, 4)));
  // [56] 0000-9999 end volume random
  endVolume = applyRandom(endVolume, parseInt(soundChars.substr(56, 4)));
  // [60] 0000-9999 duration random
  duration = applyRandom(duration, parseInt(soundChars.substr(60, 4)));
  // [64] 0000-9999 fxParamRandom
  fxParam = applyRandom(fxParam, parseInt(soundChars.substr(64, 4)));
  // [68] 0000-9999 fxnStepsRandom
  fxnSteps = applyRandom(fxnSteps, parseInt(soundChars.substr(68, 4)));

  if (
    frequency == -1 ||
    endFrequency == -1 ||
    effectVolume == -1 ||
    endVolume == -1 ||
    duration == -1 ||
    fxParam == -1 ||
    fxnSteps == -1
  ) {
    return false;
  }

  let volumeScaleFactor = 1;

  switch (wave) {
    case 0:
      fx.tone.tonePrint = Synthesizer.SineTone;
      break;
    case 1:
      fx.tone.tonePrint = Synthesizer.SawtoothTone;
      break;
    case 2:
      fx.tone.tonePrint = Synthesizer.TriangleTone;
      break;
    case 3:
      fx.tone.tonePrint = Synthesizer.SquareWaveTone;
      break;
    case 4:
      fx.tone.tonePrint = Synthesizer.NoiseTone;
      break;
  }

  fx.frequency = frequency;
  fx.duration = duration;

  fx.effects[0].steps = steps;
  switch (shape) {
    case 0:
      fx.effects[0].effect = SoundSynthesizerEffects.noInterpolation;
      break;
    case 1:
      fx.effects[0].effect = SoundSynthesizerEffects.linearInterpolation;
      fx.effects[0].parameter[0] = endFrequency;
      break;
    case 2:
      fx.effects[0].effect = SoundSynthesizerEffects.curveInterpolation;
      fx.effects[0].parameter[0] = endFrequency;
      break;
    case 5:
      fx.effects[0].effect =
        SoundSynthesizerEffects.exponentialRisingInterpolation;
      fx.effects[0].parameter[0] = endFrequency;
      break;
    case 6:
      fx.effects[0].effect =
        SoundSynthesizerEffects.exponentialFallingInterpolation;
      fx.effects[0].parameter[0] = endFrequency;
      break;
    case 8: // various ascending scales - see next switch
    case 10:
    case 12:
    case 14:
    case 16:
      fx.effects[0].effect = SoundSynthesizerEffects.appregrioAscending;
      break;
    case 9: // various descending scales - see next switch
    case 11:
    case 13:
    case 15:
    case 17:
      fx.effects[0].effect = SoundSynthesizerEffects.appregrioDescending;
      break;
    case 18:
      fx.effects[0].effect = SoundSynthesizerEffects.logarithmicInterpolation;
      fx.effects[0].parameter[0] = endFrequency;
      break;
  }

  // Scale
  switch (shape) {
    case 8:
    case 9:
      fx.effects[0].parameter_p[0] = MusicalProgressions.majorScale;
      break;
    case 10:
    case 11:
      fx.effects[0].parameter_p[0] = MusicalProgressions.minorScale;
      break;
    case 12:
    case 13:
      fx.effects[0].parameter_p[0] = MusicalProgressions.diminished;
      break;
    case 14:
    case 15:
      fx.effects[0].parameter_p[0] = MusicalProgressions.chromatic;
      break;
    case 16:
    case 17:
      fx.effects[0].parameter_p[0] = MusicalProgressions.wholeTone;
      break;
  }

  // Volume envelope
  let effectVolumeFloat = CLAMP(0, effectVolume, 1023) / 1023.0;
  let endVolumeFloat = CLAMP(0, endVolume, 1023) / 1023.0;
  fx.volume = volumeScaleFactor * effectVolumeFloat;
  fx.effects[1].effect = SoundSynthesizerEffects.volumeRampEffect;
  fx.effects[1].steps = 36;
  fx.effects[1].parameter[0] = volumeScaleFactor * endVolumeFloat;

  // Vibrato effect
  // Steps need to be spread across duration evenly.
  let normalizedFxnSteps = Math.round((fx.duration / 10000) * fxnSteps);
  switch (fxChoice) {
    case 1:
      fx.effects[2].steps = normalizedFxnSteps;
      fx.effects[2].effect = SoundSynthesizerEffects.frequencyVibratoEffect;
      fx.effects[2].parameter[0] = fxParam;
      break;
    case 2:
      fx.effects[2].steps = normalizedFxnSteps;
      fx.effects[2].effect = SoundSynthesizerEffects.volumeVibratoEffect;
      fx.effects[2].parameter[0] = fxParam;
      break;
    case 3:
      fx.effects[2].steps = normalizedFxnSteps;
      fx.effects[2].effect = SoundSynthesizerEffects.warbleInterpolation;
      fx.effects[2].parameter[0] = fxParam;
      break;
  }
  return true;
}

function random(max: number) {
  return Math.floor(Math.random() * max);
}

function CLAMP(min: number, value: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function applyRandom(value: number, rand: number) {
  if (value < 0 || rand < 0) {
    return -1;
  }
  const delta = random(rand * 2 + 1) - rand;
  return Math.abs(value + delta);
}

function blankSoundEffect() {
  const res: SoundEffect = {
    frequency: 0,
    volume: 1,
    duration: 0,
    tone: {
      tonePrint: Synthesizer.SineTone,
      parameter: [0],
    },
    effects: [],
  };

  for (let i = 0; i < EMOJI_SYNTHESIZER_TONE_EFFECTS; i++) {
    res.effects.push({
      effect: SoundSynthesizerEffects.noInterpolation,
      step: 0,
      steps: 0,
      parameter: [],
      parameter_p: [],
    });
  }

  return res;
}
