"use client"

import { useState } from "react"
import { Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react"

export const inputClass =
  "h-11 w-full rounded-sm border-[0.5px] border-border bg-bg-card px-3 text-[16px] sm:text-[13px] text-text-primary placeholder:text-text-secondary/70 transition-[border-color,box-shadow] duration-150 motion-reduce:transition-none focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/30 disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-error aria-[invalid=true]:focus:ring-error/30"

export const linkClass =
  "rounded-xs font-medium text-accent underline decoration-accent/30 underline-offset-4 transition-colors duration-150 hover:text-accent-hover hover:decoration-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"

export function Field({
  id,
  label,
  type = "text",
  autoComplete,
  placeholder,
  value,
  onChange,
  error,
  disabled,
  name,
  labelExtra,
}: {
  id: string
  label: string
  type?: string
  autoComplete: string
  placeholder: string
  value: string
  onChange: (v: string) => void
  error?: string
  disabled?: boolean
  name?: string
  labelExtra?: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-label text-text-secondary">
          {label}
        </label>
        {labelExtra}
      </div>
      <input
        id={id}
        name={name ?? id}
        type={type}
        autoComplete={autoComplete}
        required
        disabled={disabled}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={inputClass}
      />
      {error && <FieldError id={`${id}-error`} message={error} />}
    </div>
  )
}

export function PasswordField({
  id,
  label,
  autoComplete,
  placeholder,
  value,
  onChange,
  error,
  disabled,
  labelExtra,
  children,
}: {
  id: string
  label: string
  autoComplete: string
  placeholder: string
  value: string
  onChange: (v: string) => void
  error?: string
  disabled?: boolean
  labelExtra?: React.ReactNode
  children?: React.ReactNode
}) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-label text-text-secondary">
          {label}
        </label>
        {labelExtra}
      </div>
      <div className="relative">
        <input
          id={id}
          name={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          required
          disabled={disabled}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`${inputClass} pr-11`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          aria-pressed={visible}
          className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-sm text-text-secondary transition-colors duration-150 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {visible ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
        </button>
      </div>
      {children}
      {error && <FieldError id={`${id}-error`} message={error} />}
    </div>
  )
}

export function FieldError({ id, message }: { id?: string; message: string }) {
  return (
    <p id={id} className="flex items-center gap-1.5 text-small text-error">
      <AlertCircle size={12} aria-hidden="true" className="flex-shrink-0" />
      {message}
    </p>
  )
}

export function FormAlert({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-sm border-[0.5px] border-error/30 bg-error-bg px-3 py-2.5 text-body text-error"
    >
      <AlertCircle size={14} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  )
}

export function SubmitButton({
  disabled,
  loading,
  success,
  idle,
  loadingText,
  successText,
}: {
  disabled: boolean
  loading: boolean
  success?: boolean
  idle: string
  loadingText: string
  successText?: string
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className={`flex h-11 w-full items-center justify-center gap-2 rounded-sm text-[13px] font-medium text-accent-text transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-app disabled:cursor-not-allowed ${
        success
          ? "bg-success"
          : disabled && !loading
          ? "bg-border text-text-secondary"
          : "bg-accent hover:bg-accent-hover"
      }`}
    >
      {loading ? (
        <>
          <Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
          {loadingText}
        </>
      ) : success ? (
        successText
      ) : (
        idle
      )}
    </button>
  )
}
