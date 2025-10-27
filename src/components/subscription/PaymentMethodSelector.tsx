import { CreditCard, QrCode, FileText } from "lucide-react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card } from "@/components/ui/card";

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
      color: "from-blue-500 to-blue-600",
    },
    {
      value: "PIX" as PaymentMethod,
      label: "PIX",
      description: "Aprovação em até 1 hora",
      icon: QrCode,
      color: "from-green-500 to-green-600",
    },
    {
      value: "BOLETO" as PaymentMethod,
      label: "Boleto Bancário",
      description: "Aprovação em até 3 dias úteis",
      icon: FileText,
      color: "from-orange-500 to-orange-600",
    },
  ];

  return (
    <div className="space-y-4">
      <Label className="text-base font-semibold">Forma de Pagamento</Label>

      <RadioGroup value={value} onValueChange={(v) => onChange(v as PaymentMethod)}>
        <div className="grid gap-4">
          {methods.map((method) => {
            const Icon = method.icon;
            const isSelected = value === method.value;

            return (
              <Label
                key={method.value}
                htmlFor={method.value}
                className="cursor-pointer"
              >
                <Card
                  className={`relative p-4 transition-all duration-300 ${
                    isSelected
                      ? "border-primary border-2 shadow-lg"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <RadioGroupItem
                      value={method.value}
                      id={method.value}
                      className="mt-1"
                    />

                    <div
                      className={`w-12 h-12 bg-gradient-to-br ${method.color} rounded-lg flex items-center justify-center flex-shrink-0`}
                    >
                      <Icon className="w-6 h-6 text-white" />
                    </div>

                    <div className="flex-1">
                      <div className="font-semibold text-foreground">
                        {method.label}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {method.description}
                      </div>
                    </div>
                  </div>
                </Card>
              </Label>
            );
          })}
        </div>
      </RadioGroup>
    </div>
  );
}
