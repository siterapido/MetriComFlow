import { CreditCard, QrCode, FileText } from "lucide-react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export type PaymentMethod = "CREDIT_CARD" | "PIX" | "BOLETO";

interface PaymentMethodSelectorProps {
  value: PaymentMethod;
  onChange: (value: PaymentMethod) => void;
}

export function PaymentMethodSelector({ value, onChange }: PaymentMethodSelectorProps) {
  const methods = [
    {
      value: "CREDIT_CARD" as PaymentMethod,
      label: "Cartão de Crédito",
      description: "Aprovação imediata",
      icon: CreditCard,
      color: "from-primary to-secondary",
    },
    {
      value: "PIX" as PaymentMethod,
      label: "PIX",
      description: "Aprovação em até 1 hora",
      icon: QrCode,
      color: "from-success to-green-600",
    },
    {
      value: "BOLETO" as PaymentMethod,
      label: "Boleto Bancário",
      description: "Aprovação em até 3 dias úteis",
      icon: FileText,
      color: "from-warning to-orange-600",
    },
  ];

  return (
    <div className="space-y-4">
      <Label className="text-lg font-bold text-foreground">Forma de Pagamento</Label>

      <RadioGroup value={value} onValueChange={(v) => onChange(v as PaymentMethod)}>
        <div className="grid gap-3">
          {methods.map((method) => {
            const Icon = method.icon;
            const isSelected = value === method.value;

            return (
              <Label
                key={method.value}
                htmlFor={method.value}
                className="cursor-pointer"
              >
                <div
                  className={`relative bg-card border rounded-xl p-5 transition-all duration-300 hover-lift ${
                    isSelected
                      ? "border-primary border-2 shadow-lg ring-2 ring-primary/20"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <RadioGroupItem
                      value={method.value}
                      id={method.value}
                    />

                    <div
                      className={`w-11 h-11 bg-gradient-to-br ${method.color} rounded-lg flex items-center justify-center flex-shrink-0 shadow-md`}
                    >
                      <Icon className="w-6 h-6 text-white" />
                    </div>

                    <div className="flex-1">
                      <div className="font-bold text-base text-foreground">
                        {method.label}
                      </div>
                      <div className="text-sm text-muted-foreground mt-0.5">
                        {method.description}
                      </div>
                    </div>
                  </div>
                </div>
              </Label>
            );
          })}
        </div>
      </RadioGroup>
    </div>
  );
}
