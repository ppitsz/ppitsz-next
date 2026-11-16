import { cert, getApp, getApps, initializeApp, type App } from "firebase-admin/app"
import { getAuth, type Auth } from "firebase-admin/auth"
import { getFirestore, type Firestore } from "firebase-admin/firestore"
import { getStorage } from "firebase-admin/storage"

/*
 * The Admin SDK is the only way our apps touch Firebase. Browsers never call
 * Google directly, so people in mainland China without a VPN only need to
 * reach our own domains. Our collections need no security rules: the Admin SDK
 * bypasses them, and the project's Firestore rules, which belong to the old
 * website, name its own collections only, so every other one stays closed.
 *
 * Every app uses the same project, `ppitsz`, shared with the old website
 * (ADR 0013), so one session cookie works in all of them (ADR 0008).
 *
 * Every run, development included, connects to the real project: set
 * FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY,
 * FIREBASE_STORAGE_BUCKET and FIREBASE_API_KEY (in .env.local locally).
 *
 * The one exception is the automated tests (`bun run test:emulator`), which
 * wipe the database before every test: `firebase emulators:exec` sets
 * FIRESTORE_EMULATOR_HOST for them, and only then is a throwaway emulator
 * used, under the demo project "demo-ppitsz".
 */

export const DEMO_PROJECT = "demo-ppitsz"

/** Only when the test runner has started an emulator and said so. */
function useEmulators() {
  return !!process.env.FIRESTORE_EMULATOR_HOST
}

function init(): App {
  if (getApps().length > 0) return getApp()

  if (useEmulators()) {
    // Don't probe for a Google Cloud metadata server that isn't there.
    process.env.METADATA_SERVER_DETECTION ??= "none"
    // Always the demo project: .env.local holds the real project id.
    return initializeApp({ projectId: DEMO_PROJECT, storageBucket: `${DEMO_PROJECT}.appspot.com` })
  }

  const projectId = required("FIREBASE_PROJECT_ID")
  return initializeApp({
    credential: cert({
      projectId,
      clientEmail: required("FIREBASE_CLIENT_EMAIL"),
      // Env vars store the key's newlines as "\n".
      privateKey: required("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n"),
    }),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET ?? `${projectId}.firebasestorage.app`,
  })
}

function required(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`Missing environment variable ${name}`)
  return value
}

/**
 * No settings() here: Next can load this module more than once in a process
 * (pages and route handlers are bundled separately, and dev reloads it),
 * while firebase-admin is shared, and a second settings() call throws.
 * getFirestore() is safe to call any number of times. Undefined fields are
 * stripped by each app's store instead of ignoreUndefinedProperties.
 */
export function db(): Firestore {
  return getFirestore(init())
}

export function adminAuth(): Auth {
  return getAuth(init())
}

/** True only inside the emulator test runs, never in development or production. */
export function usingEmulators() {
  init()
  return useEmulators()
}

/** Set inside the emulator test runs; read after init(). */
export function authEmulatorHost() {
  init()
  return useEmulators() ? process.env.FIREBASE_AUTH_EMULATOR_HOST : undefined
}

type Bucket = ReturnType<ReturnType<typeof getStorage>["bucket"]>

export function bucket(): Bucket {
  return getStorage(init()).bucket()
}
