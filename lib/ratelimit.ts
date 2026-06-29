import type { SupabaseClient } from "@supabase/supabase-js";

export type RateLimitResult = { allowed: boolean; retryMessage: string };

/**
 * Server-enforced per-user rate limit for paid/expensive endpoints. Calls the
 * consume_rate_limit SQL function (atomic check-and-record) with the request-scoped client,
 * so auth.uid() is the calling user and the quota cannot be tampered with from the client.
 *
 * Fails closed: if the check cannot run, the call is blocked, because a surprise provider
 * bill is worse than brief downtime (see the security-audit skill, section 4).
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  kind: string,
  limit: number,
  windowSecs: number,
): Promise<RateLimitResult> {
  const { data, error } = await supabase.rpc("consume_rate_limit", {
    p_kind: kind,
    p_limit: limit,
    p_window_secs: windowSecs,
  });
  if (error) {
    console.error(`rate limit check failed for ${kind}: ${error.message}`);
    return {
      allowed: false,
      retryMessage: "Usage check is unavailable right now. Please try again shortly.",
    };
  }
  if (data !== true) {
    return {
      allowed: false,
      retryMessage:
        "You have reached the usage limit for this action. Please wait a bit and try again.",
    };
  }
  return { allowed: true, retryMessage: "" };
}

/**
 * Account-wide (global) budget cap: the same check counted across ALL users for a kind, so
 * total spend stays bounded even if every user is under their personal limit (used for the
 * monthly BigQuery free-tier cap and a daily Grok ceiling). The caller supplies a specific
 * message when blocked. Fails closed.
 */
export async function checkGlobalLimit(
  supabase: SupabaseClient,
  kind: string,
  limit: number,
  windowSecs: number,
): Promise<RateLimitResult> {
  const { data, error } = await supabase.rpc("consume_global_limit", {
    p_kind: kind,
    p_limit: limit,
    p_window_secs: windowSecs,
  });
  if (error) {
    console.error(`global budget check failed for ${kind}: ${error.message}`);
    return { allowed: false, retryMessage: "" };
  }
  return { allowed: data === true, retryMessage: "" };
}
