import { allQuestions, type AnswerInput } from "../domain/form"
import type { Answers, Form, Identity } from "../domain/types"
import { deleteMediaQuietly, uploadAnswerFile } from "../store/media"

/*
 * Reading a response from the form page's FormData. Field names: the fixed
 * fields by name (name, email, wechatId, campus, ticketTypeId), each
 * question as q:<id> (repeated for multiple choice), and each new file as
 * f:<id>. An empty file input sends a 0-byte file, which means "no change".
 */

export function readResponseInput(form: Form, formData: FormData) {
  const identity: Partial<Identity> = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    wechatId: String(formData.get("wechatId") ?? ""),
    campus: String(formData.get("campus") ?? "") as Identity["campus"],
  }
  const input: AnswerInput = { values: {}, files: {} }
  const files: Record<string, File> = {}
  for (const q of allQuestions(form)) {
    if (q.type === "file") {
      const file = formData.get(`f:${q.id}`)
      if (file instanceof File && file.size > 0) {
        files[q.id] = file
        input.files[q.id] = { name: file.name, size: file.size, contentType: file.type }
      }
    } else if (q.type === "multi") {
      input.values[q.id] = formData.getAll(`q:${q.id}`).map(String)
    } else {
      input.values[q.id] = String(formData.get(`q:${q.id}`) ?? "")
    }
  }
  return { identity, input, files, ticketTypeId: String(formData.get("ticketTypeId") ?? "") || null }
}

/**
 * Uploads the files `uploads` names and adds them to `answers`. On failure
 * the ones already stored are deleted again. Returns the stored paths.
 */
export async function storeUploads(
  formId: string,
  responseId: string,
  uploads: string[],
  files: Record<string, File>,
  answers: Answers
) {
  const stored: string[] = []
  try {
    for (const questionId of uploads) {
      const file = files[questionId]!
      const path = await uploadAnswerFile(formId, responseId, questionId, {
        bytes: new Uint8Array(await file.arrayBuffer()),
        contentType: file.type,
      })
      stored.push(path)
      answers[questionId] = { path, name: file.name.slice(0, 200), contentType: file.type, size: file.size }
    }
  } catch (error) {
    await Promise.all(stored.map(deleteMediaQuietly))
    throw error
  }
  return stored
}
