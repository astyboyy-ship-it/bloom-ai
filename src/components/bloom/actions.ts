"use server";

import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { ENGINE_IDS } from "./engines/catalog";

export type JoinState =
  | { status: "idle" }
  | { status: "error"; message: string; email: string }
  | { status: "success"; email: string; engine: (typeof ENGINE_IDS)[number]; intent: "access" | "updates" };

const schema = z.object({
  email: z.email("Enter a valid email address."),
  role: z.enum(["creator", "founder", "enterprise", "developer"]).catch("creator"),
  engine: z.enum(ENGINE_IDS).catch("general"),
  intent: z.enum(["access", "updates"]).catch("access"),
});

export async function joinNetwork(_prev: JoinState, formData: FormData): Promise<JoinState> {
  const email = String(formData.get("email") ?? "").trim();
  const parsed = schema.safeParse({
    email,
    role: formData.get("role"),
    engine: formData.get("engine"),
    intent: formData.get("intent"),
  });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Invalid input.", email };
  }

  const { role, engine, intent } = parsed.data;
  const normalized = parsed.data.email.toLowerCase();
  try {
    // A returning lead's latest choice wins, so interest reflects what they asked for most recently.
    await db.waitlistLead.upsert({
      where: { email: normalized },
      create: { email: normalized, role, engine, intent },
      update: { role, engine, intent },
    });
  } catch (err) {
    const known = err instanceof Prisma.PrismaClientKnownRequestError;
    console.error("joinNetwork: failed to save waitlist lead", known ? err.code : err);
    return { status: "error", message: "Something went wrong. Please try again.", email };
  }

  return { status: "success", email: normalized, engine, intent };
}
