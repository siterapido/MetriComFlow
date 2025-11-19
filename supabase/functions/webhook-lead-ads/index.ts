import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

type LeadPriorityValue = "low" | "medium" | "high" | "urgent";

const PRIORITY_ORDER: Record<LeadPriorityValue, number> = {
  low: 1,
  medium: 2,
  high: 3,
  urgent: 4,
};

const MAX_SOURCE_DETAIL_LENGTH = 240;
const MAX_TITLE_LENGTH = 120;

type FieldLookup = Record<string, string>;

function buildFieldLookup(fieldData: MetaLeadData["field_data"] = []): FieldLookup {
  return fieldData.reduce<FieldLookup>((acc, field) => {
    if (!field?.name) {
      return acc;
    }

    const key = field.name.toLowerCase();
    const firstValue = field.values?.find((value) => Boolean(value && value.trim()));
    if (firstValue && !acc[key]) {
      acc[key] = firstValue.trim();
    }
    return acc;
  }, {});
}

function getFieldValue(lookup: FieldLookup, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = lookup[key.toLowerCase()];
    if (value) {
      return value;
    }
  }
  return null;
}

function safeString(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function sanitizeEmail(value: string | null): string | null {
  const email = safeString(value);
  return email ? email.toLowerCase() : null;
}

function sanitizePhone(value: string | null): string | null {
  const digits = safeString(value)?.replace(/\D+/g, "");
  return digits && digits.length >= 8 ? digits : null;
}

function truncateString(value: string | null, maxLength: number): string | null {
  if (!value) {
    return null;
  }
  return value.length > maxLength ? value.slice(0, maxLength) : value;
}

function computeLeadScore(params: {
  hasEmail: boolean;
  hasPhone: boolean;
  hasCompany: boolean;
  utmSource?: string | null;
  utmCampaign?: string | null;
}): number {
  let score = 45; // baseline for paid leads

  if (params.hasEmail) {
    score += 15;
  }

  if (params.hasPhone) {
    score += 20;
  }

  if (params.hasCompany) {
    score += 5;
  }

  if (params.utmSource) {
    score += 5;
  }

  if (params.utmCampaign) {
    score += 5;
  }

  return Math.max(30, Math.min(95, score));
}

function computePriority(score: number): LeadPriorityValue {
  if (score >= 85) {
    return "urgent";
  }
  if (score >= 70) {
    return "high";
  }
  if (score >= 55) {
    return "medium";
  }
  return "low";
}

function computeConversionProbability(score: number): number {
  const probability = Math.max(10, Math.round(score * 0.7));
  return Math.min(95, probability);
}

// Verify webhook signature from Meta (Facebook) using App Secret
async function verifyMetaSignature(req: Request, rawBody: string): Promise<boolean> {
  try {
    const appSecret = Deno.env.get('META_APP_SECRET');
    if (!appSecret) {
      console.warn('META_APP_SECRET not set; skipping signature verification');
      return true; // Allow processing but log warning
    }

    const sig256 = req.headers.get('x-hub-signature-256');
    const sig1 = req.headers.get('x-hub-signature');

    const encoder = new TextEncoder();

    // Prefer SHA-256 if present
    if (sig256) {
      const elements = sig256.split('=');
      const received = elements[1]?.toLowerCase();
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(appSecret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody));
      const hex = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
      return received === hex;
    }

    // Fallback to SHA-1 header if provided
    if (sig1) {
      const elements = sig1.split('=');
      const received = elements[1]?.toLowerCase();
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(appSecret),
        { name: 'HMAC', hash: 'SHA-1' },
        false,
        ['sign']
      );
      const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody));
      const hex = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
      return received === hex;
    }

    // No signature header present
    console.warn('No X-Hub-Signature headers present; skipping verification');
    return true;
  } catch (e) {
    console.error('Error verifying Meta webhook signature:', e);
    return false;
  }
}

interface MetaLeadData {
  id: string;
  created_time: string;
  ad_id: string;
  adset_id: string;
  campaign_id: string;
  form_id: string;
  field_data: Array<{
    name: string;
    values: string[];
  }>;
}

interface WebhookEntry {
  id: string;
  time: number;
  changes: Array<{
    value: {
      leadgen_id: string;
      page_id: string;
      form_id: string;
      adgroup_id: string;
      ad_id: string;
      campaign_id: string;
    };
    field: string;
  }>;
}

Deno.serve(async (req: Request) => {
  try {
    const url = new URL(req.url);
    
    // Verificação do webhook (GET request)
    if (req.method === 'GET') {
      const mode = url.searchParams.get('hub.mode');
      const token = url.searchParams.get('hub.verify_token');
      const challenge = url.searchParams.get('hub.challenge');
      
      const VERIFY_TOKEN = Deno.env.get('META_WEBHOOK_VERIFY_TOKEN');
      
      if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('Webhook verified');
        return new Response(challenge, { status: 200 });
      } else {
        console.log('Webhook verification failed');
        return new Response('Forbidden', { status: 403 });
      }
    }

    // Processar webhook (POST request)
    if (req.method === 'POST') {
      const META_ACCESS_TOKEN = Deno.env.get('META_ACCESS_TOKEN');
      const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
      const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

      if (!META_ACCESS_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        return new Response(
          JSON.stringify({ error: 'Missing required environment variables' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Read raw body for signature verification
      const rawBody = await req.text();
      const isValid = await verifyMetaSignature(req, rawBody);
      if (!isValid) {
        return new Response(
          JSON.stringify({ error: 'Invalid webhook signature' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Parse JSON after verifying signature
      const body = JSON.parse(rawBody);

      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      console.log("[MetaWebhook] Payload received", JSON.stringify(body, null, 2));

      const results: Array<Record<string, unknown>> = [];

      for (const entry of body.entry ?? []) {
        for (const change of entry.changes ?? []) {
          if (change.field !== "leadgen") {
            continue;
          }

          const leadgenId = change.value?.leadgen_id;
          if (!leadgenId) {
            console.warn("[MetaWebhook] Skip change without leadgen_id", change);
            continue;
          }

          try {
            const leadUrl = `https://graph.facebook.com/v24.0/${leadgenId}` +
              "?fields=id,created_time,ad_id,adset_id,campaign_id,form_id,field_data" +
              `&access_token=${META_ACCESS_TOKEN}`;

            const leadResponse = await fetch(leadUrl);
            const leadData: MetaLeadData = await leadResponse.json();

            if (!leadResponse.ok) {
              console.error("[MetaWebhook] Error fetching lead data", { leadgenId, error: leadData });
              continue;
            }

            const fieldLookup = buildFieldLookup(leadData.field_data ?? []);
            const rawEmail = safeString(getFieldValue(fieldLookup, "email", "e-mail"));
            const leadEmail = sanitizeEmail(rawEmail);
            const leadPhoneRaw = safeString(
              getFieldValue(fieldLookup, "phone_number", "telefone", "phone", "whatsapp", "celular"),
            );
            const leadPhoneDigits = sanitizePhone(leadPhoneRaw);
            const companyName = safeString(
              getFieldValue(fieldLookup, "company", "company_name", "empresa", "business_name"),
            );
            const productInterest = safeString(
              getFieldValue(fieldLookup, "product_interest", "interesse", "qual_servico", "qual_produto"),
            );
            const utmSource = safeString(getFieldValue(fieldLookup, "utm_source"));
            const utmCampaign = safeString(getFieldValue(fieldLookup, "utm_campaign"));
            const utmMedium = safeString(getFieldValue(fieldLookup, "utm_medium"));
            const utmTerm = safeString(getFieldValue(fieldLookup, "utm_term"));
            const notes = safeString(getFieldValue(fieldLookup, "notes", "observacoes", "mensagem", "message"));

            const fullName = safeString(getFieldValue(fieldLookup, "full_name", "nome_completo"));
            const firstName = safeString(getFieldValue(fieldLookup, "first_name", "nome"));
            const lastName = safeString(getFieldValue(fieldLookup, "last_name", "sobrenome"));
            const combinedName = safeString([firstName, lastName].filter(Boolean).join(" "));

            let leadName = fullName ?? combinedName ?? rawEmail ?? leadPhoneRaw ?? `Lead ${leadgenId}`;
            leadName = safeString(leadName) ?? `Lead ${leadgenId}`;

            const { data: campaign, error: campaignError } = await supabase
              .from("ad_campaigns")
              .select("id, name, ad_account_id")
              .eq("external_id", leadData.campaign_id)
              .maybeSingle();

            if (campaignError) {
              console.error("[MetaWebhook] Error fetching campaign", { leadgenId, error: campaignError });
            }

            let adAccountName: string | null = null;
            if (campaign?.ad_account_id) {
              const { data: adAccount, error: adAccountError } = await supabase
                .from("ad_accounts")
                .select("business_name, external_id, organization_id")
                .eq("id", campaign.ad_account_id)
                .maybeSingle();

              if (adAccountError) {
                console.warn("[MetaWebhook] Error fetching ad account", { leadgenId, error: adAccountError });
              } else {
                adAccountName = safeString(adAccount?.business_name);
              }
            }

            const createdAtIso = new Date(leadData.created_time).toISOString();
            const leadTitle = truncateString(
              leadName && campaign?.name ? `${leadName} • ${campaign.name}` : leadName,
              MAX_TITLE_LENGTH,
            ) ?? `Lead Meta ${leadgenId}`;

            const leadSourceDetail = truncateString(
              [
                "Meta Ads",
                campaign?.name ? `Campanha: ${campaign.name}` : `Campanha ID: ${leadData.campaign_id}`,
                adAccountName ? `Conta: ${adAccountName}` : null,
                leadData.form_id ? `Formulário: ${leadData.form_id}` : null,
                utmSource ? `UTM Source: ${utmSource}` : null,
                utmCampaign ? `UTM Campaign: ${utmCampaign}` : null,
              ]
                .filter(Boolean)
                .join(" • "),
              MAX_SOURCE_DETAIL_LENGTH,
            );

            const leadScore = computeLeadScore({
              hasEmail: Boolean(leadEmail),
              hasPhone: Boolean(leadPhoneDigits),
              hasCompany: Boolean(companyName),
              utmSource,
              utmCampaign,
            });
            const priority = computePriority(leadScore);
            const conversionProbability = computeConversionProbability(leadScore);

            const descriptionLines = [
              "Lead capturado automaticamente via Meta Ads.",
              `Submissão (UTC): ${createdAtIso}`,
              companyName ? `Empresa: ${companyName}` : null,
              leadPhoneRaw ? `Telefone informado: ${leadPhoneRaw}` : null,
              productInterest ? `Interesse: ${productInterest}` : null,
              notes ? `Observações: ${notes}` : null,
              utmSource ? `utm_source=${utmSource}` : null,
              utmCampaign ? `utm_campaign=${utmCampaign}` : null,
              utmMedium ? `utm_medium=${utmMedium}` : null,
              utmTerm ? `utm_term=${utmTerm}` : null,
              `Leadgen ID: ${leadData.id}`,
              `Campanha Meta ID: ${leadData.campaign_id}`,
              leadData.form_id ? `Form ID: ${leadData.form_id}` : null,
            ];
            const description = descriptionLines.filter(Boolean).join("\n") ||
              "Lead capturado automaticamente via Meta Ads.";

            const { data: existingExternal, error: existingExternalError } = await supabase
              .from("leads")
              .select("id")
              .eq("external_lead_id", leadData.id)
              .maybeSingle();

            if (existingExternalError) {
              console.error("[MetaWebhook] Error checking external_lead_id", { leadgenId, error: existingExternalError });
              continue;
            }

            if (existingExternal?.id) {
              console.log(
                `[MetaWebhook] Leadgen ${leadgenId} already linked to lead ${existingExternal.id}, skipping new record.`,
              );
              results.push({
                leadgen_id: leadgenId,
                action: "skipped",
                reason: "duplicate_external_lead_id",
                lead_id: existingExternal.id,
              });
              continue;
            }

            let matchedLeadId: string | null = null;
            let matchedLead: any = null;

            if (leadEmail) {
              const { data: emailMatch, error: emailError } = await supabase
                .from("leads")
                .select(
                  "id, title, name, email, phone, source, priority, lead_score, conversion_probability, lead_source_detail, product_interest, campaign_id, external_lead_id",
                )
                .eq("email", leadEmail)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();

              if (emailError) {
                console.error("[MetaWebhook] Error searching lead by email", { leadEmail, error: emailError });
              } else if (emailMatch) {
                matchedLead = emailMatch;
                matchedLeadId = emailMatch.id;
              }
            }

            if (matchedLead && matchedLead.external_lead_id && matchedLead.external_lead_id !== leadData.id) {
              console.log(
                `[MetaWebhook] Email ${leadEmail} already linked to meta lead ${matchedLead.id}, skipping new record.`,
              );
              results.push({
                leadgen_id: leadgenId,
                action: "skipped",
                reason: "email_already_linked_to_other_meta_lead",
                lead_id: matchedLead.id,
              });
              continue;
            }

            if (matchedLead && matchedLeadId) {
              const updates: Record<string, unknown> = {
                external_lead_id: leadData.id,
                ad_id: leadData.ad_id,
                adset_id: leadData.adset_id,
                campaign_id: campaign?.id ?? matchedLead.campaign_id ?? null,
                source: "meta_ads",
              };

              if (leadSourceDetail) {
                updates.lead_source_detail = leadSourceDetail;
              }

              if (productInterest && !matchedLead.product_interest) {
                updates.product_interest = productInterest;
              }

              if (leadPhoneRaw && !matchedLead.phone) {
                updates.phone = leadPhoneRaw;
              }

              if (leadName && !matchedLead.name) {
                updates.name = leadName;
              }

              if ((!matchedLead.title || !matchedLead.title.trim()) && leadTitle) {
                updates.title = leadTitle;
              }

              if (leadScore > (matchedLead.lead_score ?? 0)) {
                updates.lead_score = leadScore;
              }

              if (conversionProbability > (matchedLead.conversion_probability ?? 0)) {
                updates.conversion_probability = conversionProbability;
              }

              const existingPriorityRank = matchedLead.priority
                ? PRIORITY_ORDER[(matchedLead.priority as LeadPriorityValue)] ?? 0
                : 0;
              if (PRIORITY_ORDER[priority] > existingPriorityRank) {
                updates.priority = priority;
              }

              const { data: updatedLead, error: updateError } = await supabase
                .from("leads")
                .update(updates)
                .eq("id", matchedLeadId)
                .select("id")
                .single();

              if (updateError) {
                console.error("[MetaWebhook] Error updating existing lead", { matchedLeadId, error: updateError });
                continue;
              }

              console.log(`[MetaWebhook] Updated existing lead ${matchedLeadId} (matched by email).`);
              results.push({
                leadgen_id: leadgenId,
                action: "merged",
                reason: "matched_by_email",
                lead_id: updatedLead.id,
                score: leadScore,
                priority,
              });
              continue;
            }

            const payload: Record<string, unknown> = {
              title: leadTitle,
              name: leadName,
              email: leadEmail,
              phone: leadPhoneRaw,
              description,
              status: "novo_lead",
              source: "meta_ads",
              campaign_id: campaign?.id ?? null,
              external_lead_id: leadData.id,
              ad_id: leadData.ad_id,
              adset_id: leadData.adset_id,
              created_at: createdAtIso,
              lead_source_detail: leadSourceDetail,
              product_interest: productInterest,
              priority,
              lead_score: leadScore,
              conversion_probability: conversionProbability,
              organization_id: (adAccount as any)?.organization_id ?? null,
            };

            const { data: newLead, error: insertError } = await supabase
              .from("leads")
              .insert(payload)
              .select("id")
              .single();

            if (insertError) {
              console.error("[MetaWebhook] Error inserting new lead", { leadgenId, error: insertError });
              continue;
            }

            console.log(`[MetaWebhook] Lead ${newLead.id} created from leadgen ${leadgenId}.`);
            results.push({
              leadgen_id: leadgenId,
              action: "created",
              lead_id: newLead.id,
              score: leadScore,
              priority,
            });
          } catch (error) {
            console.error("[MetaWebhook] Error processing leadgen", { leadgenId, error });
          }
        }
      }

      return new Response(
        JSON.stringify({
          message: "Webhook processed successfully",
          processed: results.length,
          results,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    return new Response('Method not allowed', { status: 405 });

  } catch (error) {
    console.error('Error in webhook-lead-ads:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
