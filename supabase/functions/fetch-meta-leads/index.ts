import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const META_GRAPH_API_VERSION = "v21.0";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface MetaLeadData {
  id: string;
  created_time: string;
  ad_id: string;
  ad_name?: string;
  adset_id?: string;
  adset_name?: string;
  campaign_id?: string;
  campaign_name?: string;
  form_id?: string;
  form_name?: string;
  field_data: Array<{
    name: string;
    values: string[];
  }>;
}

interface FetchLeadsRequest {
  ad_account_ids?: string[]; // Internal ad_accounts.id (UUIDs)
  since?: string; // ISO date (YYYY-MM-DD)
  until?: string; // ISO date (YYYY-MM-DD)
  limit?: number; // Max leads per account (default: 100)
  dryRun?: boolean; // If true, don't insert leads
}

interface FetchLeadsResponse {
  success: boolean;
  stats: {
    total_fetched: number;
    new_leads: number;
    duplicate_leads: number;
    errors: number;
  };
  accounts_processed: number;
  leads_by_account: Record<string, number>;
  errors?: string[];
}

Deno.serve(async (req) => {
  // CORS headers
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    });
  }

  try {
    const requestBody: FetchLeadsRequest = await req.json();
    const {
      ad_account_ids,
      since,
      until,
      limit = 100,
      dryRun = false,
    } = requestBody;

    console.log("fetch-meta-leads: Starting fetch", {
      ad_account_ids,
      since,
      until,
      limit,
      dryRun,
    });

    // Calculate default date range (last 7 days)
    const defaultUntil = new Date().toISOString().split("T")[0];
    const defaultSince = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    const sinceDate = since || defaultSince;
    const untilDate = until || defaultUntil;

    // Fetch ad accounts to sync
    let adAccountsQuery = supabase
      .from("ad_accounts")
      .select(`
        id,
        external_id,
        business_name,
        organization_id,
        meta_business_connections!inner(
          access_token,
          token_expires_at,
          is_active
        )
      `)
      .eq("is_active", true)
      .eq("meta_business_connections.is_active", true);

    if (ad_account_ids && ad_account_ids.length > 0) {
      adAccountsQuery = adAccountsQuery.in("id", ad_account_ids);
    }

    const { data: adAccounts, error: accountsError } = await adAccountsQuery;

    if (accountsError) {
      throw new Error(`Failed to fetch ad accounts: ${accountsError.message}`);
    }

    if (!adAccounts || adAccounts.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No active ad accounts found",
          stats: {
            total_fetched: 0,
            new_leads: 0,
            duplicate_leads: 0,
            errors: 0,
          },
          accounts_processed: 0,
          leads_by_account: {},
        }),
        {
          headers: { "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    console.log(`Found ${adAccounts.length} ad accounts to process`);

    const stats = {
      total_fetched: 0,
      new_leads: 0,
      duplicate_leads: 0,
      errors: 0,
    };
    const leadsByAccount: Record<string, number> = {};
    const errors: string[] = [];

    // Process each ad account
    for (const adAccount of adAccounts) {
      try {
        console.log(`Processing account: ${adAccount.business_name} (${adAccount.external_id})`);

        const accessToken = (adAccount as any).meta_business_connections?.access_token;

        if (!accessToken) {
          console.warn(`No access token for account ${adAccount.external_id}, skipping`);
          errors.push(`No access token for account ${adAccount.business_name}`);
          stats.errors++;
          continue;
        }

        // Fetch leads from Meta API
        const leadsFromMeta = await fetchLeadsFromMetaAPI(
          adAccount.external_id,
          accessToken,
          sinceDate,
          untilDate,
          limit
        );

        console.log(`Fetched ${leadsFromMeta.length} leads from Meta for ${adAccount.business_name}`);

        stats.total_fetched += leadsFromMeta.length;
        leadsByAccount[adAccount.business_name || adAccount.external_id] = leadsFromMeta.length;

        if (dryRun) {
          console.log(`Dry run mode: skipping lead insertion for ${adAccount.business_name}`);
          continue;
        }

        // Process and insert each lead
        for (const metaLead of leadsFromMeta) {
          try {
            // Check if lead already exists
            const { data: existingLead } = await supabase
              .from("leads")
              .select("id")
              .eq("external_lead_id", metaLead.id)
              .eq("organization_id", adAccount.organization_id)
              .single();

            if (existingLead) {
              console.log(`Lead ${metaLead.id} already exists, skipping`);
              stats.duplicate_leads++;
              continue;
            }

            // Parse field data
            const fieldLookup = buildFieldLookup(metaLead.field_data);

            // Find campaign_id from external_id
            let campaignId: string | null = null;
            if (metaLead.campaign_id) {
              const { data: campaign } = await supabase
                .from("ad_campaigns")
                .select("id")
                .eq("external_id", metaLead.campaign_id)
                .eq("ad_account_id", adAccount.id)
                .single();

              campaignId = campaign?.id || null;
            }

            // Create lead in CRM
            const leadData = {
              title: buildLeadTitle(fieldLookup, metaLead),
              email: getFieldValue(fieldLookup, "email", "e-mail"),
              phone: getFieldValue(fieldLookup, "phone", "telefone", "phone_number"),
              name: getFieldValue(fieldLookup, "full_name", "name", "nome"),
              company: getFieldValue(fieldLookup, "company_name", "company", "empresa"),
              status: "novo_lead",
              source: "meta_ads",
              external_lead_id: metaLead.id,
              campaign_id: campaignId,
              ad_id: metaLead.ad_id,
              adset_id: metaLead.adset_id,
              lead_source_detail: metaLead.ad_name || metaLead.campaign_name || "Meta Lead Ads",
              organization_id: adAccount.organization_id,
              value: 0,
              priority: "medium",
              lead_score: 50,
              conversion_probability: 0,
              created_at: metaLead.created_time,
              // Store full field data in a JSONB column if available
              // metadata: metaLead.field_data,
            };

            const { data: insertedLead, error: insertError } = await supabase
              .from("leads")
              .insert(leadData)
              .select("id")
              .single();

            if (insertError) {
              console.error(`Error inserting lead ${metaLead.id}:`, insertError);
              errors.push(`Failed to insert lead ${metaLead.id}: ${insertError.message}`);
              stats.errors++;
            } else {
              console.log(`Successfully inserted lead ${metaLead.id} as ${insertedLead.id}`);
              stats.new_leads++;
            }
          } catch (leadError) {
            console.error(`Error processing lead ${metaLead.id}:`, leadError);
            errors.push(`Error processing lead ${metaLead.id}: ${leadError.message}`);
            stats.errors++;
          }
        }
      } catch (accountError) {
        console.error(`Error processing account ${adAccount.business_name}:`, accountError);
        errors.push(`Error processing account ${adAccount.business_name}: ${accountError.message}`);
        stats.errors++;
      }
    }

    const response: FetchLeadsResponse = {
      success: true,
      stats,
      accounts_processed: adAccounts.length,
      leads_by_account: leadsByAccount,
      errors: errors.length > 0 ? errors : undefined,
    };

    console.log("fetch-meta-leads: Completed", response);

    return new Response(JSON.stringify(response), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("fetch-meta-leads: Fatal error", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function fetchLeadsFromMetaAPI(
  adAccountId: string,
  accessToken: string,
  since: string,
  until: string,
  limit: number
): Promise<MetaLeadData[]> {
  const leads: MetaLeadData[] = [];

  // Convert ad_account_id format (remove 'act_' if present)
  const accountId = adAccountId.startsWith("act_")
    ? adAccountId
    : `act_${adAccountId}`;

  // Convert dates to Unix timestamps
  const sinceTimestamp = Math.floor(new Date(since).getTime() / 1000);
  const untilTimestamp = Math.floor(new Date(until).getTime() / 1000);

  const url = `https://graph.facebook.com/${META_GRAPH_API_VERSION}/${accountId}/leads`;

  const params = new URLSearchParams({
    access_token: accessToken,
    filtering: JSON.stringify([
      {
        field: "time_created",
        operator: "GREATER_THAN",
        value: sinceTimestamp.toString(),
      },
      {
        field: "time_created",
        operator: "LESS_THAN",
        value: untilTimestamp.toString(),
      },
    ]),
    fields: "id,created_time,ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,form_id,form_name,field_data",
    limit: Math.min(limit, 500).toString(), // Meta max is 500
  });

  let nextUrl: string | null = `${url}?${params.toString()}`;

  while (nextUrl && leads.length < limit) {
    try {
      const response = await fetch(nextUrl);

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Meta API error (${response.status}):`, errorBody);

        // Handle rate limiting
        if (response.status === 429 || response.status === 400) {
          console.warn("Rate limit hit or bad request, stopping fetch");
          break;
        }

        throw new Error(`Meta API returned ${response.status}: ${errorBody}`);
      }

      const data = await response.json();

      if (data.data && Array.isArray(data.data)) {
        leads.push(...data.data);
      }

      // Check for pagination
      nextUrl = data.paging?.next || null;

      // Respect limit
      if (leads.length >= limit) {
        break;
      }
    } catch (fetchError) {
      console.error("Error fetching from Meta API:", fetchError);
      throw fetchError;
    }
  }

  return leads.slice(0, limit);
}

function buildFieldLookup(fieldData: MetaLeadData["field_data"]): Record<string, string> {
  const lookup: Record<string, string> = {};

  for (const field of fieldData) {
    if (!field?.name) continue;

    const key = field.name.toLowerCase();
    const firstValue = field.values?.find((v) => Boolean(v && v.trim()));

    if (firstValue && !lookup[key]) {
      lookup[key] = firstValue.trim();
    }
  }

  return lookup;
}

function getFieldValue(lookup: Record<string, string>, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = lookup[key.toLowerCase()];
    if (value) return value;
  }
  return null;
}

function buildLeadTitle(lookup: Record<string, string>, metaLead: MetaLeadData): string {
  const name = getFieldValue(lookup, "full_name", "name", "nome");
  const company = getFieldValue(lookup, "company_name", "company", "empresa");
  const email = getFieldValue(lookup, "email", "e-mail");

  if (name && company) {
    return `${name} - ${company}`;
  } else if (name) {
    return name;
  } else if (email) {
    return email;
  } else if (company) {
    return company;
  } else {
    return `Lead ${metaLead.id.slice(0, 8)}`;
  }
}
