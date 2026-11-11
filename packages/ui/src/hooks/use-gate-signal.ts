"use client"

import { useSyncExternalStore } from "react"

import type { GateVerdict } from "@ppitsz/ui/components/blocks/gate"

/*
 * The gate's beep and buzz, as at a fare gate: staff at a loud door hear the
 * answer to a scan before they read it. Go is one high beep, hold two middle
 * beeps, stop one low buzzer tone, and the phone buzzes in the same rhythm
 * where it can (Android). Browsers only make sound after a tap on the page,
 * so the scanner calls prime() on pointerdown. Sound can be turned off per
 * phone; the buzz always comes.
 */

interface Tone {
  hz: number
  ms: number
  /** Start, after the first tone. */
  at: number
  wave: OscillatorType
  volume: number
}

const TONES: Record<GateVerdict, Tone[]> = {
  go: [{ hz: 1320, ms: 120, at: 0, wave: "sine", volume: 0.25 }],
  hold: [
    { hz: 880, ms: 100, at: 0, wave: "sine", volume: 0.25 },
    { hz: 880, ms: 100, at: 180, wave: "sine", volume: 0.25 },
  ],
  stop: [{ hz: 220, ms: 450, at: 0, wave: "square", volume: 0.08 }],
}

const BUZZ: Record<GateVerdict, VibratePattern> = {
  go: 60,
  hold: [60, 80, 60],
  stop: 400,
}

const SOUND_KEY = "ppitsz:gate-sound"

let context: AudioContext | null = null
const listeners = new Set<() => void>()

function soundOn() {
  try {
    return localStorage.getItem(SOUND_KEY) !== "off"
  } catch {
    return true
  }
}

function setSound(on: boolean) {
  try {
    localStorage.setItem(SOUND_KEY, on ? "on" : "off")
  } catch {
    // Private mode: the choice lasts until reload.
  }
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Unlocks sound; call from a tap or click. */
function prime() {
  if (typeof AudioContext === "undefined") return
  context ??= new AudioContext()
  if (context.state === "suspended") void context.resume()
}

function signal(verdict: GateVerdict) {
  navigator.vibrate?.(BUZZ[verdict])
  if (!soundOn() || context?.state !== "running") return
  const start = context.currentTime
  for (const tone of TONES[verdict]) {
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = tone.wave
    oscillator.frequency.value = tone.hz
    const from = start + tone.at / 1000
    const to = from + tone.ms / 1000
    // Short ramps, so a tone starts and stops without a click.
    gain.gain.setValueAtTime(0, from)
    gain.gain.linearRampToValueAtTime(tone.volume, from + 0.01)
    gain.gain.setValueAtTime(tone.volume, to - 0.02)
    gain.gain.linearRampToValueAtTime(0, to)
    oscillator.connect(gain).connect(context.destination)
    oscillator.start(from)
    oscillator.stop(to)
  }
}

export function useGateSignal() {
  const sound = useSyncExternalStore(subscribe, soundOn, () => true)
  return { sound, setSound, prime, signal }
}
