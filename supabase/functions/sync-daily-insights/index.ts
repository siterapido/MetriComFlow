import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Enhanced sync: supports full-year ranges, pagination, per-account tokens,
// rate limit checks, validation-only mode, and detailed logging.

interface MetaInsightRow {
  campaign_id: string;
  date_start: string; // daily breakdown date
  date_stop?: string;
  spend?: string;
  impressions?: string;
  clicks?: string;
  actions?: Array<{
    action_type: string;
    value: string;
  }>;
}

type SyncRequestBody = {
  // ISO dates (YYYY-MM-DD). Inclusive
  since?: string;
  until?: string;
  // Filter by internal ad_accounts.id
  ad_account_ids?: string[];
  // Filter by external Meta campaign IDs (plain numeric ids)
  campaign_external_ids?: string[];
  // When true, validate connection/params but do not write to DB
  dryRun?: boolean;
  // Max days per request chunk (1..90). Default 30
  maxDaysPerChunk?: number;
  // Log a sample of the API response for debugging
  logResponseSample?: boolean;
};

const LEAD_ACTION_TYPES = new Set([
  "lead",
  "leads",
  "leadgen.other",
  "onsite_conversion.lead_grouped",
  "onsite_conversion.lead_form.submit",
]);

function normalizeIsoDate(input: string | undefined, fallbackIso: string): string {
  if (!input) return fallbackIso;
  try {
    const d = new Date(input);
    if (!Number.isFinite(+d)) return fallbackIso;
    return d.toISOString().split("T")[0];
  } catch {
    return fallbackIso;
  }
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0];
}

function chunkDateRange(since: string, until: string, maxDays: number): Array<{ start: string; end: string }> {
  const chunks: Array<{ start: string; end: string }> = [];
  let cursor = since;
  while (new Date(cursor + "T00:00:00Z").getTime() <= new Date(until + "T00:00:00Z").getTime()) {
    const proposedEnd = addDays(cursor, maxDays - 1);
    const end = new Date(proposedEnd + "T00:00:00Z").getTime() > new Date(until + "T00:00:00Z").getTime()
      ? until
      : proposedEnd;
    chunks.push({ start: cursor, end });
    cursor = addDays(end, 1);
  }
  return chunks;
}

function sanitizeUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.searchParams.has("access_token")) {
      u.searchParams.set("access_token", "***");
    }
    return u.toString();
  } catch {
    return url.replace(/access_token=[^&]+/, "access_token=***");
  }
}

Deno.serve(async (req: Request) => {
  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Secrets
    const META_ACCESS_TOKEN = Deno.env.get('META_ACCESS_TOKEN');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ error: 'Missing required environment variables' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Body and params
    const body: SyncRequestBody = await req.json().catch(() => ({} as SyncRequestBody));
    const todayIso = new Date().toISOString().split('T')[0];
    const defaultSince = addDays(todayIso, -1);
    const since = normalizeIsoDate(body.since, defaultSince);
    const until = normalizeIsoDate(body.until, defaultSince);
    const dryRun = !!body.dryRun;
    const logResponseSample = !!body.logResponseSample;
    const maxDaysPerChunk = Math.min(Math.max(body.maxDaysPerChunk ?? 30, 1), 90);
    const filterAdAccountIds = Array.isArray(body.ad_account_ids) && body.ad_account_ids.length > 0 ? body.ad_account_ids : null;
    const filterCampaignExternalIds = Array.isArray(body.campaign_external_ids) && body.campaign_external_ids.length > 0 ? body.campaign_external_ids : null;

    console.log('=== sync-daily-insights START ===');
    console.log('Request at:', new Date().toISOString());
    console.log('Parameters:', { since, until, dryRun, maxDaysPerChunk, filterAdAccounts: filterAdAccountIds?.length || 0, filterCampaigns: filterCampaignExternalIds?.length || 0 });

    // Accounts query
    let adAccountsQuery = supabase
      .from('ad_accounts')
      .select('id, external_id, connected_by, organization_id, is_active');

    if (filterAdAccountIds) {
      adAccountsQuery = adAccountsQuery.in('id', filterAdAccountIds);
    }

    const { data: adAccounts, error: accountsError } = await adAccountsQuery;
    if (accountsError) {
      throw new Error(`Error fetching ad accounts: ${accountsError.message}`);
    }

    if (!adAccounts || adAccounts.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No ad accounts found' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const summary: any = {
      accountsProcessed: 0,
      accountsSkipped: 0,
      totalCampaigns: 0,
      totalMetaRows: 0,
      totalDbUpserts: 0,
      chunks: [] as Array<{ account: string; campaignCount: number; since: string; until: string; rows: number }>,
      notes: [] as string[],
    };

    // Iterate accounts
    for (const account of adAccounts) {
      try {
        if (account.is_active === false) {
          summary.accountsSkipped += 1;
          summary.notes.push(`Account ${account.external_id} inactive; skipping.`);
          continue;
        }

        // Resolve access token (prefer user-connected token; fallback to env)
        let accessToken: string | null = null;
        if (account.connected_by) {
          const { data: conn } = await supabase
            .from('meta_business_connections')
            .select('access_token, token_expires_at')
            .eq('user_id', account.connected_by)
            .eq('is_active', true)
            .order('connected_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (conn?.access_token) {
            if (conn.token_expires_at) {
              const exp = new Date(conn.token_expires_at);
              if (Date.now() < exp.getTime()) {
                accessToken = conn.access_token;
              } else {
                console.warn(`Access token for user ${account.connected_by} expired at ${conn.token_expires_at}. Falling back to META_ACCESS_TOKEN.`);
              }
            } else {
              accessToken = conn.access_token;
            }
          }
        }
        if (!accessToken) {
          if (!META_ACCESS_TOKEN) {
            console.error('Missing META_ACCESS_TOKEN and no active user token found.');
            summary.accountsSkipped += 1;
            summary.notes.push(`No valid token for account ${account.external_id}`);
            continue;
          }
          accessToken = META_ACCESS_TOKEN;
        }

        // Connectivity check
        const checkUrl = `https://graph.facebook.com/v24.0/act_${account.external_id}?fields=id,name&access_token=${accessToken}`;
        const checkRes = await fetch(checkUrl);
        if (!checkRes.ok) {
          const checkText = await checkRes.text();
          console.error('Meta API connectivity check failed:', { account: account.external_id, status: checkRes.status, statusText: checkRes.statusText, url: sanitizeUrl(checkUrl), error: checkText });
          summary.accountsSkipped += 1;
          summary.notes.push(`Connectivity failed for account ${account.external_id}: ${checkRes.status}`);
          continue;
        }

        // Campaigns for this account
        let campaignsQuery = supabase
          .from('ad_campaigns')
          .select('id, external_id')
          .eq('ad_account_id', account.id);
        if (filterCampaignExternalIds) {
          campaignsQuery = campaignsQuery.in('external_id', filterCampaignExternalIds);
        }
        const { data: campaigns, error: campaignsError } = await campaignsQuery;
        if (campaignsError) {
          console.error(`Error fetching campaigns for account ${account.external_id}:`, campaignsError);
          continue;
        }
        if (!campaigns || campaigns.length === 0) {
          summary.notes.push(`No campaigns for account ${account.external_id}`);
          continue;
        }

        summary.accountsProcessed += 1;
        summary.totalCampaigns += campaigns.length;

        // Build chunks
        const dateChunks = chunkDateRange(since, until, maxDaysPerChunk);

        for (const chunk of dateChunks) {
          const fields = [
            'campaign_id',
            'date_start',
            'date_stop',
            'spend',
            'impressions',
            'clicks',
            'actions',
          ].join(',');

          const filtering = encodeURIComponent(
            JSON.stringify([
              { field: 'campaign.id', operator: 'IN', value: campaigns.map(c => c.external_id) },
            ])
          );

          const baseUrl = `https://graph.facebook.com/v24.0/act_${account.external_id}/insights` +
            `?fields=${fields}` +
            `&level=campaign` +
            `&time_increment=1` +
            `&filtering=${filtering}` +
            `&time_range={"since":"${chunk.start}","until":"${chunk.end}"}` +
            `&limit=1000` +
            `&access_token=${accessToken}`;

          console.log('Requesting Meta insights:', { account: account.external_id, chunk, campaigns: campaigns.length, url: sanitizeUrl(baseUrl) });

          let nextUrl: string | null = baseUrl;
          let rows: MetaInsightRow[] = [];
          let requestCount = 0;
          let rateLimitHeaders: Record<string, string | null> = {};
          const startedAt = Date.now();

          while (nextUrl) {
            requestCount += 1;
            const res = await fetch(nextUrl);
            rateLimitHeaders = {
              'x-app-usage': res.headers.get('x-app-usage'),
              'x-ad-account-usage': res.headers.get('x-ad-account-usage'),
              'x-business-use-case-usage': res.headers.get('x-business-use-case-usage'),
            };

            if (!res.ok) {
              const errorText = await res.text();
              console.error('Meta API error:', { account: account.external_id, status: res.status, statusText: res.statusText, url: sanitizeUrl(nextUrl), rateLimitHeaders, error: errorText });
              // Detect rate limit
              try {
                const err = JSON.parse(errorText);
                const code = err?.error?.code;
                if (code === 4 || code === 17 || code === 613 || res.status === 429) {
                  return new Response(
                    JSON.stringify({ error: 'Rate limit reached when calling Meta API', details: { code, rateLimitHeaders } }),
                    { status: 429, headers: { 'Content-Type': 'application/json' } }
                  );
                }
              } catch (parseErr) {
                void parseErr;
              }
              // Abort this chunk but continue other accounts/chunks
              break;
            }

            const data = await res.json();
            if (logResponseSample) {
              console.log('Meta API response sample:', { account: account.external_id, firstItems: (data?.data || []).slice(0, 2) });
            }
            rows = rows.concat(data?.data || []);
            nextUrl = data?.paging?.next ?? null;
          }

          summary.totalMetaRows += rows.length;
          summary.chunks.push({ account: account.external_id, campaignCount: campaigns.length, since: chunk.start, until: chunk.end, rows: rows.length });
          console.log('Meta insights fetched:', { account: account.external_id, elapsedMs: Date.now() - startedAt, requests: requestCount, rows: rows.length, rateLimitHeaders });

          if (dryRun) {
            console.log('Dry run enabled; skipping DB upsert for this chunk.');
            continue;
          }

          // Map to DB rows
          const upserts = rows.map((insight) => {
            const leadsAction = (insight.actions || []).find(a => LEAD_ACTION_TYPES.has(a.action_type));
            const leadsCount = leadsAction ? parseInt(String(leadsAction.value)) : 0;
            const campaign = campaigns.find(c => c.external_id === insight.campaign_id);
            return campaign ? {
              campaign_id: campaign.id,
              date: insight.date_start,
              spend: parseFloat(String(insight.spend ?? '0')) || 0,
              impressions: parseInt(String(insight.impressions ?? '0')) || 0,
              clicks: parseInt(String(insight.clicks ?? '0')) || 0,
              leads_count: Number.isFinite(leadsCount) ? leadsCount : 0,
            } : null;
          }).filter(Boolean) as Array<{
            campaign_id: string; date: string; spend: number; impressions: number; clicks: number; leads_count: number;
          }>;

          // Upsert in batches
          const batchSize = 500;
          let upserted = 0;
          for (let i = 0; i < upserts.length; i += batchSize) {
            const slice = upserts.slice(i, i + batchSize);
            const { error: upsertError } = await supabase
              .from('campaign_daily_insights')
              .upsert(slice, { onConflict: 'campaign_id,date', ignoreDuplicates: false });
            if (upsertError) {
              console.error(`Error upserting ${slice.length} insights for account ${account.external_id}:`, upsertError);
            } else {
              upserted += slice.length;
            }
          }
          summary.totalDbUpserts += upserted;
          console.log('DB upsert completed for chunk:', { account: account.external_id, upserted });
        }
      } catch (error) {
        console.error(`Error processing account ${account.external_id}:`, error);
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Insights sync completed',
        params: { since, until, dryRun, maxDaysPerChunk },
        summary,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in sync-daily-insights:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
