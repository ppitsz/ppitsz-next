"use client"

import { SpeakerHighIcon, SpeakerSlashIcon } from "@phosphor-icons/react"

import { Toggle } from "@ppitsz/ui/components/toggle"
import { useGateSignal } from "@ppitsz/ui/hooks/use-gate-signal"

/** Turns the gate's beep on or off for this phone. The buzz stays. */
function GateSoundToggle({ className }: { className?: string }) {
  const { sound, setSound, prime } = useGateSignal()
  return (
    <Toggle
      variant="quiet"
      size="md"
      pressed={sound}
      onPressedChange={(on) => {
        if (on) prime()
        setSound(on)
      }}
      className={className}
    >
      {sound ? <SpeakerHighIcon aria-hidden /> : <SpeakerSlashIcon aria-hidden />}
      {sound ? "Sound on" : "Sound off"}
    </Toggle>
  )
}

export { GateSoundToggle }
