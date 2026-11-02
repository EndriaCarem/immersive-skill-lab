import { describe, expect, it } from "vitest";
import {
  attemptStatus,
  canOpenActivity,
  deliverySchema,
  isAttemptLimitError,
  MAX_ATTEMPTS,
} from "@/lib/learning-rules";
import type { Program, Submission } from "@/lib/store";

const sub = (id: string, extra: Partial<Submission> = {}): Submission => ({
  id,
  programId: "p1",
  activityId: "a1",
  student: "account",
  fileName: "piece.pdf",
  fileSize: 20,
  aiUse: "",
  submittedAt: `2026-11-02T10:0${id}:00Z`,
  ...extra,
});

describe("two deliveries per activity", () => {
  it("allows exactly two attempts", () => expect(MAX_ATTEMPTS).toBe(2));
  it("offers two attempts before any delivery", () => {
    expect(attemptStatus([], "p1", "a1")).toEqual({ used: 0, max: 2, left: 2, reached: false });
  });
  it("leaves one attempt after the first delivery", () => {
    expect(attemptStatus([sub("1")], "p1", "a1")).toEqual({
      used: 1,
      max: 2,
      left: 1,
      reached: false,
    });
  });
  it("reaches the limit after the second delivery", () => {
    expect(attemptStatus([sub("1"), sub("2")], "p1", "a1").reached).toBe(true);
  });
  it("treats legacy activities with more than two deliveries as reached, keeping them all", () => {
    const legacy = [sub("1"), sub("2"), sub("3")];
    expect(attemptStatus(legacy, "p1", "a1")).toEqual({ used: 3, max: 2, left: 0, reached: true });
  });
  it("counts only the same program and activity", () => {
    expect(
      attemptStatus([sub("1", { activityId: "a2" }), sub("2", { programId: "p2" })], "p1", "a1")
        .used,
    ).toBe(0);
  });
  it("recognizes the database rejection by hint or message", () => {
    expect(isAttemptLimitError({ hint: "learning_attempt_limit", message: "x" })).toBe(true);
    expect(
      isAttemptLimitError({ message: "Limite de 2 tentativas atingido para esta atividade." }),
    ).toBe(true);
    expect(isAttemptLimitError({ message: "Entregue a atividade anterior primeiro" })).toBe(false);
    expect(isAttemptLimitError(null)).toBe(false);
  });
  it("still rejects files above 10 MB and other formats before upload", () => {
    const ok = {
      programId: "p1",
      activityId: "a1",
      fileName: "a.pdf",
      fileSize: 10 * 1024 * 1024,
      filePath: "u/p1/a.pdf",
      aiUse: "",
    };
    expect(deliverySchema.safeParse(ok).success).toBe(true);
    expect(deliverySchema.safeParse({ ...ok, fileSize: 10 * 1024 * 1024 + 1 }).success).toBe(false);
    expect(deliverySchema.safeParse({ ...ok, fileName: "a.png" }).success).toBe(false);
  });
  it("keeps progression: next activity opens after one delivery of the previous", () => {
    const program = { id: "p1", activities: [{ id: "a1" }, { id: "a2" }] } as Program;
    expect(canOpenActivity(program, [], 1)).toBe(false);
    expect(canOpenActivity(program, [sub("1")], 1)).toBe(true);
  });
});
