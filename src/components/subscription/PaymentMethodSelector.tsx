import { CreditCard } from "lucide-react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export type PaymentMethod = "CREDIT_CARD";

interface PaymentMethodSelectorProps {
  value: PaymentMethod;
  onChange: (value: PaymentMethod) => void;
}

export function PaymentMethodSelector({ value, onChange }: PaymentMethodSelectorProps) {
  const methods = [
    {
      value: "CREDIT_CARD" as PaymentMethod,
      label: "Cartão de Crédito",
      description: "Pagamento seguro com cartão de crédito",
      icon: CreditCard,
      color: "from-blue-500 to-blue-600",
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
                  <div className="flex items-center space-x-4">
                    <RadioGroupItem
                      value={method.value}
                      id={method.value}
                      className="mt-1"
                    />

                    <div className="flex-1 flex items-center space-x-4">
                      <div
                        className={`w-12 h-12 rounded-lg bg-gradient-to-br ${method.color} flex items-center justify-center shadow-md`}
                      >
                        <Icon className="w-6 h-6 text-white" />
                      </div>

                      <div className="flex-1">
                        <div className="font-semibold text-foreground text-lg">
                          {method.label}
                        </div>
                        <div className="text-muted-foreground text-sm">
                          {method.description}
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="absolute top-3 right-3">
                        <div className="w-3 h-3 bg-primary rounded-full animate-pulse" />
                      </div>
                    )}
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