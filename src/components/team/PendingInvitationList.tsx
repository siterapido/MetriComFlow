import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Mail, RefreshCcw, Shield, Trash2 } from "lucide-react";
import type { TeamInvitation } from "@/hooks/useInvitations";

interface PendingInvitationListProps {
  invitations: TeamInvitation[];
  onResend: (invitation: TeamInvitation) => void;
  onRevoke: (invitationId: string) => void;
  isProcessing: boolean;
}

export function PendingInvitationList({
  invitations,
  onResend,
  onRevoke,
  isProcessing,
}: PendingInvitationListProps) {
  if (invitations.length === 0) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Sem convites pendentes</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Quando você convidar novos membros, eles aparecerão aqui até aceitarem o convite.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {invitations.map((invitation) => {
        const expiresIn = new Date(invitation.expires_at).toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "short",
        });

        return (
          <Card key={invitation.id}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle className="text-base font-semibold">{invitation.email}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Enviado em {new Date(invitation.created_at).toLocaleDateString("pt-BR")}
                </p>
              </div>
              <div className="flex gap-2">
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  {invitation.role === "member"
                    ? "Membro"
                    : invitation.role === "manager"
                      ? "Manager"
                      : invitation.role === "admin"
                        ? "Admin"
                        : "Owner"}
                </Badge>
                <Badge className="flex items-center gap-1" variant="outline">
                  <Mail className="h-3 w-3" />
                  {invitation.user_type === "sales"
                    ? "CRM"
                    : invitation.user_type === "traffic_manager"
                      ? "Tráfego"
                      : "Owner"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Expira em {expiresIn}
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onResend(invitation)}
                      disabled={isProcessing}
                    >
                      <RefreshCcw className="mr-1 h-4 w-4" />
                      Reenviar
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Gera um novo link e envia novamente o email.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onRevoke(invitation.id)}
                disabled={isProcessing}
              >
                <Trash2 className="mr-1 h-4 w-4" />
                Revogar
              </Button>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
