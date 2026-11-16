"use client"

import { Field, FieldDescription, FieldError, FieldLabel } from "@ppitsz/ui/components/field"
import { Input } from "@ppitsz/ui/components/input"
import { NativeSelect, NativeSelectOption } from "@ppitsz/ui/components/native-select"

/** One labelled input with its helper and error. Controlled when `onChange` is given; passwords stay uncontrolled. */
export function TextField({
  name,
  label,
  helper,
  error,
  optional,
  type = "text",
  autoComplete,
  value,
  onChange,
}: {
  name: string
  label: string
  helper?: string
  error?: string
  optional?: boolean
  type?: string
  autoComplete?: string
  value?: string
  onChange?: (value: string) => void
}) {
  const id = `field-${name}`
  const describedBy = [helper && `${id}-helper`, error && `${id}-error`].filter(Boolean).join(" ")
  return (
    <Field data-invalid={!!error || undefined}>
      <FieldLabel htmlFor={id} optional={optional}>
        {label}
      </FieldLabel>
      <Input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        {...(onChange ? { value: value ?? "", onChange: (e) => onChange(e.target.value) } : {})}
        aria-invalid={!!error || undefined}
        aria-describedby={describedBy || undefined}
      />
      {helper && <FieldDescription id={`${id}-helper`}>{helper}</FieldDescription>}
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
    </Field>
  )
}

/** One labelled native select, controlled, whose first option is an empty prompt. */
export function SelectField({
  name,
  label,
  prompt,
  options,
  helper,
  error,
  value,
  onChange,
}: {
  name: string
  label: string
  prompt: string
  options: { value: string; label: string }[]
  helper?: string
  error?: string
  value: string
  onChange: (value: string) => void
}) {
  const id = `field-${name}`
  const describedBy = [helper && `${id}-helper`, error && `${id}-error`].filter(Boolean).join(" ")
  return (
    <Field data-invalid={!!error || undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <NativeSelect
        id={id}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error || undefined}
        aria-describedby={describedBy || undefined}
      >
        <NativeSelectOption value="" disabled>
          {prompt}
        </NativeSelectOption>
        {options.map((option) => (
          <NativeSelectOption key={option.value} value={option.value}>
            {option.label}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      {helper && <FieldDescription id={`${id}-helper`}>{helper}</FieldDescription>}
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
    </Field>
  )
}
