import { CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ValidationIndicatorProps {
  status: "idle" | "validating" | "valid" | "invalid" | "warning";
  message?: string;
  className?: string;
}

export function ValidationIndicator({ 
  status, 
  message, 
  className 
}: ValidationIndicatorProps) {
  if (status === "idle") return null;

  const getIcon = () => {
    switch (status) {
      case "validating":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case "valid":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "invalid":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "warning":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getTextColor = () => {
    switch (status) {
      case "validating":
        return "text-blue-600";
      case "valid":
        return "text-green-600";
      case "invalid":
        return "text-red-600";
      case "warning":
        return "text-yellow-600";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <div className={cn("flex items-center gap-2 mt-1", className)}>
      {getIcon()}
      {message && (
        <span className={cn("text-xs", getTextColor())}>
          {message}
        </span>
      )}
    </div>
  );
}

interface PasswordStrengthIndicatorProps {
  password: string;
  className?: string;
}

export function PasswordStrengthIndicator({ 
  password, 
  className 
}: PasswordStrengthIndicatorProps) {
  const getStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: "", color: "" };
    
    let score = 0;
    const checks = {
      length: pwd.length >= 8,
      lowercase: /[a-z]/.test(pwd),
      uppercase: /[A-Z]/.test(pwd),
      numbers: /[0-9]/.test(pwd),
      symbols: /[^A-Za-z0-9]/.test(pwd),
    };

    score = Object.values(checks).filter(Boolean).length;

    if (score < 2) return { score, label: "Muito fraca", color: "bg-red-500" };
    if (score < 3) return { score, label: "Fraca", color: "bg-orange-500" };
    if (score < 4) return { score, label: "Média", color: "bg-yellow-500" };
    if (score < 5) return { score, label: "Forte", color: "bg-green-500" };
    return { score, label: "Muito forte", color: "bg-green-600" };
  };

  const strength = getStrength(password);
  
  if (!password) return null;

  return (
    <div className={cn("mt-2", className)}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground">Força da senha:</span>
        <span className="text-xs font-medium">{strength.label}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-1.5">
        <div
          className={cn("h-1.5 rounded-full transition-all duration-300", strength.color)}
          style={{ width: `${(strength.score / 5) * 100}%` }}
        />
      </div>
      <div className="mt-1 text-xs text-muted-foreground">
        <div className="grid grid-cols-2 gap-1">
          <span className={password.length >= 8 ? "text-green-600" : ""}>
            ✓ 8+ caracteres
          </span>
          <span className={/[0-9]/.test(password) ? "text-green-600" : ""}>
            ✓ Números
          </span>
          <span className={/[a-z]/.test(password) ? "text-green-600" : ""}>
            ✓ Minúsculas
          </span>
          <span className={/[A-Z]/.test(password) ? "text-green-600" : ""}>
            ✓ Maiúsculas
          </span>
        </div>
      </div>
    </div>
  );
}