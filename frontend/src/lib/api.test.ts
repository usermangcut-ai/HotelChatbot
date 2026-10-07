import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiFetch } from "./api";

afterEach(() => vi.unstubAllGlobals());

describe("apiFetch", () => {
  it("returns parsed JSON on success", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: 1 }), { status: 200 })));
    await expect(apiFetch("/api/x")).resolves.toEqual({ ok: 1 });
  });
  it("throws ApiError carrying the server detail message", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: "Hết phòng" }), { status: 409 })));
    await expect(apiFetch("/api/x")).rejects.toMatchObject({ status: 409, message: "Hết phòng" });
  });
  it("uses the first validation message for 422 lists", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: [{ msg: "Ngày sai" }] }), { status: 422 })));
    const err = await apiFetch("/api/x").catch(e => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).message).toBe("Ngày sai");
  });
});
