import { useEffect, useMemo } from "react";
import { useForm, Controller, RegisterOptions } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import type { PublicLeadFormField } from "@/hooks/usePublicLeadForm";

type FormValues = Record<string, unknown>;

export interface FormRendererProps {
  formName: string;
  fields: PublicLeadFormField[];
  submitting?: boolean;
  onSubmit: (values: FormValues) => Promise<void> | void;
  hasSubmitted?: boolean;
  successMessage?: string | null;
  errorMessage?: string | null;
  variantName?: string | null;
}

function resolveDefaultValue(field: PublicLeadFormField): unknown {
  const defaults = field.validations?.defaultValue;

  if (field.type === "checkbox") {
    if (typeof defaults === "boolean") return defaults;
    if (typeof defaults === "string") return defaults === "true";
    return false;
  }

  if (field.type === "multiselect") {
    if (Array.isArray(defaults)) {
      return defaults;
    }
    if (typeof defaults === "string") {
      return defaults
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
    return [];
  }

  if (defaults !== undefined && defaults !== null) {
    return defaults;
  }

  if (field.type === "select" && field.options.length > 0) {
    return field.options[0]?.value ?? "";
  }

  if (field.type === "hidden") {
    return defaults ?? "";
  }

  return "";
}

function validationRules(field: PublicLeadFormField): RegisterOptions<FormValues, string> {
  const rules: RegisterOptions<FormValues, string> = {};

  if (field.isRequired) {
    rules.required = `O campo "${field.label}" é obrigatório.`;
  }

  const validations = field.validations ?? {};

  if (typeof validations.minLength === "number") {
    rules.minLength = {
      value: validations.minLength,
      message: `Informe ao menos ${validations.minLength} caracteres.`,
    };
  }

  if (typeof validations.maxLength === "number") {
    rules.maxLength = {
      value: validations.maxLength,
      message: `Use no máximo ${validations.maxLength} caracteres.`,
    };
  }

  if (validations.pattern && typeof validations.pattern === "string") {
    try {
      const regex = new RegExp(validations.pattern);
      rules.pattern = {
        value: regex,
        message:
          typeof validations.patternMessage === "string"
            ? validations.patternMessage
            : `Formato inválido para "${field.label}".`,
      };
    } catch (_error) {
      // Ignore invalid regex definitions
    }
  }

  if (field.type === "email") {
    rules.pattern = {
      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: "Informe um email válido.",
    };
  }

  if (field.type === "phone") {
    rules.validate = (value) => {
      if (!value) return true;
      const digits = String(value).replace(/\D+/g, "");
      return digits.length >= 8 || "Informe um telefone válido.";
    };
  }

  return rules;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-sm text-destructive mt-1">{message}</p>;
}

export const FormRenderer = ({
  formName,
  fields,
  submitting,
  onSubmit,
  hasSubmitted,
  successMessage,
  errorMessage,
  variantName,
}: FormRendererProps) => {
  const defaults = useMemo(() => {
    return fields.reduce<FormValues>((acc, field) => {
      acc[field.key] = resolveDefaultValue(field);
      return acc;
    }, {});
  }, [fields]);

  const {
    control,
    handleSubmit,
    register,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: defaults,
    mode: "onChange",
    reValidateMode: "onChange",
  });

  useEffect(() => {
    reset(defaults);
  }, [defaults, reset]);

  useEffect(() => {
    if (hasSubmitted) {
      reset(defaults);
    }
  }, [hasSubmitted, reset, defaults]);

  const renderField = (field: PublicLeadFormField) => {
    const error = errors[field.key];
    const isHidden = field.type === "hidden";
    const className = cn("space-y-2", isHidden && "hidden");

    switch (field.type) {
      case "textarea":
        return (
          <div key={field.id} className={className}>
            <Label htmlFor={field.id}>
              {field.label}
              {field.isRequired && <span className="ml-1 text-destructive">*</span>}
            </Label>
            <Textarea
              id={field.id}
              placeholder={field.placeholder ?? undefined}
              rows={4}
              {...register(field.key, validationRules(field))}
            />
            {field.helpText && <p className="text-sm text-muted-foreground">{field.helpText}</p>}
            <FieldError message={error?.message as string | undefined} />
          </div>
        );

      case "select":
        return (
          <div key={field.id} className={className}>
            <Label htmlFor={field.id}>
              {field.label}
              {field.isRequired && <span className="ml-1 text-destructive">*</span>}
            </Label>
            <Controller
              control={control}
              name={field.key}
              rules={validationRules(field)}
              render={({ field: controller }) => (
                <Select value={(controller.value as string) ?? ""} onValueChange={controller.onChange}>
                  <SelectTrigger id={field.id}>
                    <SelectValue placeholder={field.placeholder ?? "Selecione uma opção"} />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {field.helpText && <p className="text-sm text-muted-foreground">{field.helpText}</p>}
            <FieldError message={error?.message as string | undefined} />
          </div>
        );

      case "multiselect":
        return (
          <div key={field.id} className={className}>
            <Label>
              {field.label}
              {field.isRequired && <span className="ml-1 text-destructive">*</span>}
            </Label>
            <Controller
              name={field.key}
              control={control}
              rules={validationRules(field)}
              render={({ field: controller }) => {
                const selected = Array.isArray(controller.value) ? (controller.value as string[]) : [];
                const toggleOption = (value: string) => {
                  if (selected.includes(value)) {
                    controller.onChange(selected.filter((option) => option !== value));
                    return;
                  }
                  controller.onChange([...selected, value]);
                };

                return (
                  <div className="space-y-2">
                    {field.options.map((option) => (
                      <div key={option.value} className="flex items-center gap-3 rounded-md border border-border p-2">
                        <Checkbox
                          id={`${field.id}-${option.value}`}
                          checked={selected.includes(option.value)}
                          onCheckedChange={() => toggleOption(option.value)}
                        />
                        <Label htmlFor={`${field.id}-${option.value}`} className="font-normal">
                          {option.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                );
              }}
            />
            {field.helpText && <p className="text-sm text-muted-foreground">{field.helpText}</p>}
            <FieldError message={error?.message as string | undefined} />
          </div>
        );

      case "checkbox":
        return (
          <Controller
            key={field.id}
            name={field.key}
            control={control}
            rules={validationRules(field)}
            render={({ field: controller }) => (
              <div className={className}>
                <div className="flex items-center gap-3">
                  <Checkbox
                    id={field.id}
                    checked={Boolean(controller.value)}
                    onCheckedChange={controller.onChange}
                  />
                  <Label htmlFor={field.id} className="font-normal">
                    {field.label}
                    {field.isRequired && <span className="ml-1 text-destructive">*</span>}
                  </Label>
                </div>
                {field.helpText && <p className="text-sm text-muted-foreground">{field.helpText}</p>}
                <FieldError message={error?.message as string | undefined} />
              </div>
            )}
          />
        );

      case "radio":
        return (
          <div key={field.id} className={className}>
            <Label>
              {field.label}
              {field.isRequired && <span className="ml-1 text-destructive">*</span>}
            </Label>
            <Controller
              name={field.key}
              control={control}
              rules={validationRules(field)}
              render={({ field: controller }) => (
                <RadioGroup value={(controller.value as string) ?? ""} onValueChange={controller.onChange}>
                  {field.options.map((option) => (
                    <div key={option.value} className="flex items-center gap-2 rounded-md border border-border p-2">
                      <RadioGroupItem value={option.value} id={`${field.id}-${option.value}`} />
                      <Label htmlFor={`${field.id}-${option.value}`} className="font-normal">
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}
            />
            {field.helpText && <p className="text-sm text-muted-foreground">{field.helpText}</p>}
            <FieldError message={error?.message as string | undefined} />
          </div>
        );

      case "date":
        return (
          <div key={field.id} className={className}>
            <Label htmlFor={field.id}>
              {field.label}
              {field.isRequired && <span className="ml-1 text-destructive">*</span>}
            </Label>
            <Input id={field.id} type="date" {...register(field.key, validationRules(field))} />
            {field.helpText && <p className="text-sm text-muted-foreground">{field.helpText}</p>}
            <FieldError message={error?.message as string | undefined} />
          </div>
        );

      case "hidden":
        return <input key={field.id} type="hidden" {...register(field.key)} />;

      case "phone":
      case "email":
      case "text":
      default:
        return (
          <div key={field.id} className={className}>
            <Label htmlFor={field.id}>
              {field.label}
              {field.isRequired && <span className="ml-1 text-destructive">*</span>}
            </Label>
            <Input
              id={field.id}
              type={field.type === "email" ? "email" : field.type === "phone" ? "tel" : "text"}
              placeholder={field.placeholder ?? undefined}
              {...register(field.key, validationRules(field))}
            />
            {field.helpText && <p className="text-sm text-muted-foreground">{field.helpText}</p>}
            <FieldError message={error?.message as string | undefined} />
          </div>
        );
    }
  };

  const handleFormSubmit = handleSubmit(async (values) => {
    await onSubmit(values);
  });

  return (
    <div className="w-full max-w-2xl rounded-2xl border border-border bg-card/80 backdrop-blur p-6 shadow-lg">
      <div className="space-y-2 text-center">
        <h2 className="text-xl font-semibold text-foreground">{formName}</h2>
        {variantName && <p className="text-sm text-muted-foreground">Campanha: {variantName}</p>}
      </div>

      {errorMessage && (
        <Alert variant="destructive" className="mt-6">
          <AlertTitle>Não foi possível enviar</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {hasSubmitted && successMessage ? (
        <div className="mt-6 rounded-xl border border-primary/30 bg-primary/10 p-6 text-center text-foreground">
          <p className="text-lg font-medium">{successMessage}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Nossa equipe já recebeu seus dados e fará contato em breve.
          </p>
        </div>
      ) : (
        <form onSubmit={handleFormSubmit} className="mt-6 space-y-6">
          {fields.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum campo configurado. Entre em contato com o administrador do CRM.
            </p>
          ) : (
            fields.map((field) => renderField(field))
          )}

          <Button type="submit" className="w-full" disabled={Boolean(submitting) || fields.length === 0}>
            {submitting ? "Enviando..." : "Enviar formulário"}
          </Button>
        </form>
      )}
    </div>
  );
};
