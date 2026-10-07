import { beforeEach, describe, expect, it } from "vitest";
import { clearChat, loadChat, saveChat } from "./chatStorage";

describe("chatStorage", () => {
  beforeEach(() => sessionStorage.clear());
  it("creates a fresh UUID session when nothing is stored", () => {
    const s = loadChat();
    expect(s.sessionId).toMatch(/^[A-Za-z0-9_-]{8,64}$/);
    expect(s.messages).toEqual([]);
  });
  it("round-trips messages (survives a reload)", () => {
    const s = loadChat();
    saveChat({ ...s, messages: [{ id: "1", role: "user", text: "xin chào" }] });
    expect(loadChat()).toEqual({ sessionId: s.sessionId, messages: [{ id: "1", role: "user", text: "xin chào" }] });
  });
  it("ignores corrupted storage", () => {
    sessionStorage.setItem("sr-chat-v1", "{not json");
    expect(loadChat().messages).toEqual([]);
    sessionStorage.setItem("sr-chat-v1", JSON.stringify({ sessionId: "x", messages: [] }));
    expect(loadChat().sessionId).not.toBe("x");
  });
  it("clearChat starts a new session", () => {
    const before = loadChat();
    saveChat(before);
    const after = clearChat();
    expect(after.sessionId).not.toBe(before.sessionId);
    expect(loadChat()).toEqual(after);
  });
});
