import { z } from "zod";

export const LeadSchema = z.object({
  leadName: z.string().trim().max(120).default(""),
  company: z.string().trim().max(120).default(""),
  budgetK: z
    .union([z.number(), z.string(), z.null()])
    .optional()
    .transform((v, ctx) => {
      if (v === undefined || v === null || v === "") return null;
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0 || n > 1_000_000) {
        ctx.addIssue({ code: "custom", message: "budgetK must be a number between 0 and 1,000,000" });
        return z.NEVER;
      }
      return n;
    }),
  message: z.string().trim().min(1, "message is required").max(4000),
});

export const DispatchSchema = z.object({
  action: z.enum(["outreach", "vip", "quarantine"]),
  lead: LeadSchema,
  score: z.number().min(0).max(100),
  tier: z.enum(["VIP", "QUALIFIED", "NURTURE"]),
  persona: z.enum(["buyer", "evaluator", "competitor", "student", "unknown"]).default("unknown"),
  channel: z.string().trim().max(40).default("inbound"),
});
