import { describe, expect, test } from "bun:test"

import { ShopError } from "../domain/errors"
import { alertPayload, alertText, createThrottle } from "./alerts"

describe("error alerts", () => {
  test("speak each chat service's format", () => {
    expect(alertPayload("https://open.feishu.cn/open-apis/bot/v2/hook/x", "hi")).toEqual({
      msg_type: "text",
      content: { text: "hi" },
    })
    expect(alertPayload("https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=x", "hi")).toEqual({
      msgtype: "text",
      text: { content: "hi" },
    })
    expect(alertPayload("https://discord.com/api/webhooks/1/x", "hi")).toEqual({ content: "hi" })
    expect(alertPayload("https://api.telegram.org/bot1:x/sendMessage?chat_id=-100", "hi")).toEqual({
      chat_id: "-100",
      text: "hi",
    })
    expect(alertPayload("https://hooks.slack.com/services/x", "hi")).toEqual({ text: "hi" })
  })

  test("the same error is sent once per window, and the next one says how many were held back", () => {
    const throttle = createThrottle(1000)
    expect(throttle("a", 0)).toBe(0)
    expect(throttle("a", 10)).toBeNull()
    expect(throttle("a", 20)).toBeNull()
    expect(throttle("b", 30)).toBe(0)
    expect(throttle("a", 1001)).toBe(2)
  })

  test("expected refusals and Next.js control flow never alert", () => {
    expect(alertText(new ShopError("SOLD_OUT"), "action")).toBeNull()
    expect(alertText(Object.assign(new Error("x"), { digest: "NEXT_REDIRECT;replace;/staff" }), "render")).toBeNull()
    const text = alertText(new Error("Firestore unavailable"), "action POST /checkout")!
    expect(text).toStartWith("PPITSZ Shop: server error")
    expect(text).toContain("Where: action POST /checkout")
    expect(text).toContain("Message: Firestore unavailable")
  })
})
