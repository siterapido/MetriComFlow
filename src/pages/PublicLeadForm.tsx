import { useCallback, useMemo, useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { FormRenderer } from "@/components/forms/FormRenderer";
import { collectFormTrackingData } from "@/lib/tracking";
import { usePublicLeadForm, PublicLeadFormTheme } from "@/hooks/usePublicLeadForm";
import { supabase } from "@/lib/supabase";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Meta Pixel helper
declare global {
  interface Window {
    fbq?: (action: string, event: string, params?: Record<string, any>) => void;
  }
}

interface SubmitSuccessState {
  success: boolean;
  message?: string | null;
}

const buildThemeStyle = (theme: PublicLeadFormTheme | null | undefined) => {
  if (!theme || typeof theme !== "object") {
    return {};
  }

  const colors = theme.colors ?? {};
  const style: Record<string, string> = {};

  if (typeof colors.primary === "string") {
    style["--form-primary-color"] = colors.primary;
  }
  if (typeof colors.background === "string") {
    style["--form-background"] = colors.background;
  }
  if (typeof colors.card === "string") {
    style["--form-card"] = colors.card;
  }
  if (typeof colors.text === "string") {
    style["--form-text"] = colors.text;
  }

  return style;
};

const PublicLeadForm = () => {
  const { formId, orgSlug: _orgSlug, profileSlug, formSlug } = useParams<{
    formId?: string;
    orgSlug?: string;
    profileSlug?: string;
    formSlug?: string;
  }>();
  const [searchParams] = useSearchParams();
  const variantSlug = searchParams.get("variant");

  const { data, isLoading, error } = usePublicLeadForm({ formId, profileSlug, formSlug, variantSlug });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionState, setSubmissionState] = useState<SubmitSuccessState | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const themeStyle = useMemo(() => buildThemeStyle(data?.theme), [data?.theme]);
  const branding = useMemo(() => {
    const b = (data?.theme && typeof data.theme === "object" ? (data.theme as any).branding : null) || {};
    return {
      bannerUrl: typeof b.bannerUrl === "string" && b.bannerUrl.length > 0 ? (b.bannerUrl as string) : null,
      logoUrl: typeof b.logoUrl === "string" && b.logoUrl.length > 0 ? (b.logoUrl as string) : null,
    };
  }, [data?.theme]);

  // Track page view with Meta Pixel (if available)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.fbq && data?.id) {
      window.fbq('track', 'ViewContent', {
        content_name: data.name,
        content_category: 'lead_form',
        content_ids: [data.id],
      });
    }
  }, [data?.id, data?.name]);

  const handleSubmit = useCallback(
    async (values: Record<string, unknown>) => {
      const resolvedFormId = data?.id ?? formId;
      if (!resolvedFormId) return;
      setIsSubmitting(true);
      setSubmissionError(null);

      try {
        const tracking = collectFormTrackingData();
        const { data: response, error: invokeError } = await supabase.functions.invoke("submit-lead-form", {
          body: {
            formId: resolvedFormId,
            variantSlug,
            payload: values,
            tracking,
          },
        });

        if (invokeError) {
          console.error("[PublicLeadForm] submit error", invokeError);
          setSubmissionState(null);
          setSubmissionError(invokeError.message ?? "Não foi possível enviar. Tente novamente.");
          return;
        }

        if (response?.error) {
          const issues = Array.isArray(response.issues)
            ? response.issues.map((item: { message?: string }) => item?.message).filter(Boolean)
            : [];
          setSubmissionState(null);
          setSubmissionError(
            issues.length > 0 ? issues.join("\n") : response.error ?? "Não foi possível enviar. Revise os dados.",
          );
          return;
        }

        setSubmissionState({
          success: true,
          message: response?.message ?? data?.successMessage ?? null,
        });
        setSubmissionError(null);

        // Track Lead event with Meta Pixel
        if (typeof window !== 'undefined' && window.fbq) {
          window.fbq('track', 'Lead', {
            content_name: data?.name,
            content_category: 'lead_form',
            value: 0,
            currency: 'BRL',
          });
        }
      } catch (submitError) {
        console.error("[PublicLeadForm] unexpected error", submitError);
        setSubmissionState(null);
        setSubmissionError("Erro inesperado ao enviar o formulário. Tente novamente em instantes.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [formId, data?.id, variantSlug, data?.successMessage],
  );

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-primary/40 text-foreground">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Carregando formulário...
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-primary/40 text-foreground p-6">
        <Alert variant="destructive" className="max-w-md">
          <AlertTitle>Formulário indisponível</AlertTitle>
          <AlertDescription>
            {error?.message ??
              "Não foi possível encontrar este formulário ou ele não está mais disponível. Entre em contato com a equipe responsável."}
          </AlertDescription>
        </Alert>
      </main>
    );
  }

  if (!data.isActive) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-primary/40 text-foreground p-6">
        <Alert className="max-w-md border-border bg-card/80 backdrop-blur">
          <AlertTitle>Formulário desativado</AlertTitle>
          <AlertDescription>
            Este formulário foi desativado temporariamente. Caso precise enviar suas informações, entre em contato com a
            equipe InsightFy.
          </AlertDescription>
        </Alert>
      </main>
    );
  }

  return (
    <main
      className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-primary/40 px-4 py-16 text-foreground"
      style={themeStyle}
    >
      <div className="flex w-full max-w-5xl flex-col items-center gap-8">
        {(branding.bannerUrl || branding.logoUrl) && (
          <div className="w-full max-w-3xl">
            <div className="relative">
              {branding.bannerUrl ? (
                <img src={branding.bannerUrl} alt="Capa do formulário" className="h-40 w-full rounded-xl object-cover md:h-56" />
              ) : (
                <div className="h-40 w-full rounded-xl bg-gradient-to-r from-primary/20 to-secondary/20 md:h-56" />
              )}
              {branding.logoUrl && (
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 transform">
                  <img
                    src={branding.logoUrl}
                    alt="Logo da empresa"
                    className="h-16 w-16 rounded-full border-2 border-white/70 shadow-md ring-2 ring-white/50 object-cover bg-white"
                  />
                </div>
              )}
            </div>
            {/* Espaço para a logo sobreposta */}
            {branding.logoUrl && <div className="h-10" />}
          </div>
        )}
        {data.description && (
          <div className="max-w-2xl text-center">
            <p className="text-sm text-muted-foreground">{data.description}</p>
          </div>
        )}

        <FormRenderer
          formName={data.name}
          fields={data.fields}
          submitting={isSubmitting}
          onSubmit={handleSubmit}
          hasSubmitted={submissionState?.success}
          successMessage={submissionState?.message ?? data.successMessage}
          errorMessage={submissionError}
          variantName={data.activeVariant?.name ?? null}
        />
      </div>
    </main>
  );
};

export default PublicLeadForm;
