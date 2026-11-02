"use client"

import { useEffect, useRef, useState } from "react"

/*
 * Reads QR codes from the phone camera. Uses the browser's own detector
 * where there is one (Chrome on Android) and jsQR everywhere else (Safari).
 * Both run on the device, so scanning needs no network.
 */

export type CameraState = "starting" | "on" | "denied" | "unavailable"

type Detect = (source: CanvasImageSource, width: number, height: number) => Promise<string | null>

interface NativeDetector {
  detect(source: CanvasImageSource): Promise<{ rawValue: string }[]>
}
declare global {
  interface Window {
    BarcodeDetector?: {
      new (options: { formats: string[] }): NativeDetector
      getSupportedFormats(): Promise<string[]>
    }
  }
}

let detectorPromise: Promise<Detect> | null = null

/** One decoder per page, picked once. */
function getDetector(): Promise<Detect> {
  detectorPromise ??= (async () => {
    const Native = window.BarcodeDetector
    if (Native && (await Native.getSupportedFormats().catch((): string[] => [])).includes("qr_code")) {
      const detector = new Native({ formats: ["qr_code"] })
      return async (source) => (await detector.detect(source))[0]?.rawValue ?? null
    }
    const { default: jsQR } = await import("jsqr")
    const canvas = document.createElement("canvas")
    const context = canvas.getContext("2d", { willReadFrequently: true })!
    return async (source, width, height) => {
      // Small frames decode fast enough on a cheap phone.
      const scale = Math.min(1, 720 / Math.max(width, height))
      canvas.width = Math.round(width * scale)
      canvas.height = Math.round(height * scale)
      context.drawImage(source, 0, 0, canvas.width, canvas.height)
      const image = context.getImageData(0, 0, canvas.width, canvas.height)
      return jsQR(image.data, image.width, image.height, { inversionAttempts: "attemptBoth" })?.data ?? null
    }
  })()
  return detectorPromise
}

/** Decodes a QR from a photo or screenshot. */
export async function decodeImageFile(file: File): Promise<string | null> {
  const bitmap = await createImageBitmap(file)
  try {
    return await (await getDetector())(bitmap, bitmap.width, bitmap.height)
  } finally {
    bitmap.close()
  }
}

/**
 * Streams the back camera into `videoRef` and calls `onScan` with each new
 * code while `paused` is false. The camera stops while the tab is hidden.
 */
export function useQrCamera(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  { paused, onScan }: { paused: boolean; onScan: (text: string) => void }
) {
  const [state, setState] = useState<CameraState>("starting")
  const pausedRef = useRef(paused)
  const onScanRef = useRef(onScan)
  useEffect(() => {
    pausedRef.current = paused
    onScanRef.current = onScan
  })

  useEffect(() => {
    // Cameras need HTTPS (or localhost) and a browser that allows them.
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      queueMicrotask(() => setState("unavailable"))
      return
    }
    let stream: MediaStream | null = null
    let timer: ReturnType<typeof setTimeout> | undefined
    let stopped = false

    async function start() {
      if (stream || stopped) return
      setState("starting")
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        })
      } catch (error) {
        const name = error instanceof DOMException ? error.name : ""
        setState(name === "NotAllowedError" || name === "SecurityError" ? "denied" : "unavailable")
        return
      }
      if (stopped) return stop()
      const video = videoRef.current
      if (!video) return stop()
      video.srcObject = stream
      await video.play().catch(() => {})
      setState("on")
      tick()
    }

    function stop() {
      clearTimeout(timer)
      stream?.getTracks().forEach((track) => track.stop())
      stream = null
    }

    async function tick() {
      const video = videoRef.current
      if (!stream || !video) return
      if (!pausedRef.current && video.readyState >= 2) {
        const text = await (await getDetector())(video, video.videoWidth, video.videoHeight).catch(
          () => null
        )
        if (text && !pausedRef.current) onScanRef.current(text)
      }
      timer = setTimeout(tick, 150)
    }

    function onVisibility() {
      if (document.hidden) stop()
      else start()
    }

    start()
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      stopped = true
      document.removeEventListener("visibilitychange", onVisibility)
      stop()
    }
  }, [videoRef])

  return state
}
