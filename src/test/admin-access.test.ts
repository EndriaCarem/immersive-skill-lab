import { describe, expect, it, vi, beforeEach } from "vitest";
const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc } }));
import { canShowAdministration } from "@/lib/admin-access";

describe("administration navigation access", () => {
  beforeEach(() => rpc.mockReset());
  it("hides administration from signed-out visitors without querying roles", async () => {
    expect(await canShowAdministration(undefined)).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });
  it("hides administration from students", async () => {
    rpc.mockResolvedValue({ data: false, error: null });
    expect(await canShowAdministration("student-id")).toBe(false);
    expect(rpc).toHaveBeenCalledWith("has_role", { _user_id: "student-id", _role: "admin" });
  });
  it("shows administration only after a positive admin role check", async () => {
    rpc.mockResolvedValue({ data: true, error: null });
    expect(await canShowAdministration("admin-id")).toBe(true);
    expect(rpc).toHaveBeenCalledWith("has_role", { _user_id: "admin-id", _role: "admin" });
  });
  it("hides administration when verification fails", async () => {
    rpc.mockResolvedValue({ data: true, error: { message: "Unavailable" } });
    expect(await canShowAdministration("admin-id")).toBe(false);
  });
});