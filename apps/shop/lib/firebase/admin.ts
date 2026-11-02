/*
 * Firebase is set up once for every app, on one project, so one session
 * works everywhere (ADR 0008): see @ppitsz/accounts/firebase.
 */
export { adminAuth, authEmulatorHost, bucket, db, usingEmulators } from "@ppitsz/accounts/firebase"
