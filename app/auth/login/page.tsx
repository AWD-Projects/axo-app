"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAnimate, useReducedMotion } from "framer-motion"
import { createClient } from "@/src/lib/supabase/client"
import { AuthShell } from "../_components/AuthShell"
import { Field, PasswordField, FormAlert, SubmitButton, linkClass } from "../_components/fields"

type FormState = "idle" | "loading" | "error"

export default function LoginPage() {
  const router = useRouter()
  const reduceMotion = useReducedMotion()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [state, setState] = useState<FormState>("idle")
  const [errorMsg, setErrorMsg] = useState("")
  const [formRef, animateForm] = useAnimate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setState("loading")
    setErrorMsg("")

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setState("error")
      setErrorMsg(
        error.message === "Invalid login credentials"
          ? "Correo o contraseña incorrectos"
          : error.message
      )
      if (!reduceMotion) {
        animateForm(formRef.current, { x: [0, -6, 6, -4, 4, -2, 2, 0] }, { duration: 0.38, ease: "easeInOut" })
      }
      return
    }

    router.push("/dashboard")
  }

  const isLoading = state === "loading"
  const hasError = state === "error"
  const reset = () => {
    if (hasError) setState("idle")
  }

  return (
    <AuthShell
      titulo="Tu colonia, con su linaje a la vista."
      texto="Entra para revisar la bitácora, el linaje de cada ejemplar y el parentesco de tus próximas cruzas."
    >
      <h1 className="text-h1 text-text-primary">Iniciar sesión</h1>
      <p className="mt-1.5 text-body-l text-text-secondary">Entra a tu refugio con tu correo y contraseña.</p>

      <form ref={formRef} onSubmit={handleSubmit} noValidate className="mt-8 space-y-4">
        <Field
          id="email"
          label="Correo electrónico"
          type="email"
          autoComplete="email"
          placeholder="tu@correo.com"
          value={email}
          onChange={(v) => {
            setEmail(v)
            reset()
          }}
          disabled={isLoading}
        />

        <PasswordField
          id="password"
          label="Contraseña"
          autoComplete="current-password"
          placeholder="Tu contraseña"
          value={password}
          onChange={(v) => {
            setPassword(v)
            reset()
          }}
          disabled={isLoading}
          labelExtra={
            <Link href="/auth/reset-password" className={`${linkClass} text-small`}>
              ¿Olvidaste tu contraseña?
            </Link>
          }
        />

        {hasError && errorMsg && <FormAlert message={errorMsg} />}

        <div className="pt-2">
          <SubmitButton
            disabled={isLoading || !email || !password}
            loading={isLoading}
            idle="Ingresar"
            loadingText="Ingresando..."
          />
        </div>
      </form>

      <p className="mt-8 text-body text-text-secondary">
        ¿No tienes cuenta?{" "}
        <Link href="/auth/register" className={linkClass}>
          Crear cuenta
        </Link>
      </p>
    </AuthShell>
  )
}
