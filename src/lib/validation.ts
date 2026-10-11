import { z } from "zod";
import { AREAS, STATES } from "./constants";
export const uuid = z.string().uuid();
export const signupSchema = z.object({email:z.email(),password:z.string().min(12).max(128),full_name:z.string().trim().min(3).max(100),role:z.enum(["client","lawyer","company"]),consent:z.literal(true)});
export const profileSchema = z.object({full_name:z.string().trim().min(3).max(100),city:z.string().trim().max(80),state:z.union([z.enum(STATES),z.literal("")]),company_name:z.string().trim().max(150)});
export const lawyerSchema = z.object({display_name:z.string().trim().min(3).max(100),bio:z.string().trim().min(30).max(2000),oab_number:z.string().regex(/^\d{1,10}$/),oab_state:z.enum(STATES),city:z.string().trim().min(2).max(80),state:z.enum(STATES),areas:z.array(z.enum(AREAS)).min(1).max(12),experience_years:z.number().int().min(0).max(80),available:z.boolean(),avatar_url:z.union([z.url().max(1000),z.literal("")])});
export const contactSchema = z.object({lawyer_id:uuid,subject:z.string().trim().min(5).max(120),description:z.string().trim().min(10).max(2000)});
export const messageSchema = z.object({conversation_id:uuid,body:z.string().trim().min(1).max(4000)});
export const verificationSchema = z.object({user_id:uuid,status:z.enum(["approved","rejected"]),note:z.string().trim().min(10).max(1000)});
export const reportSchema = z.object({target_id:uuid,reason:z.string().trim().min(10).max(2000)});
export function safeNext(value: string | null) {
 if (!value || !value.startsWith("/") || /[\\\u0000-\u0020]/.test(value) || /%(?:0[0-9a-f]|1[0-9a-f]|20|2f|5c|25)/i.test(value)) return "/dashboard";
 try { const url=new URL(value,"https://talklawyer.invalid");return url.origin==="https://talklawyer.invalid" ? url.pathname+url.search+url.hash : "/dashboard"; } catch { return "/dashboard"; }
}
