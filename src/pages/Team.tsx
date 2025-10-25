import { useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { InviteMemberDialog } from "@/components/team/InviteMemberDialog";
import { TeamMemberCard } from "@/components/team/TeamMemberCard";
import { PendingInvitationList } from "@/components/team/PendingInvitationList";
import { useActiveOrganization } from "@/hooks/useActiveOrganization";
import { useTeam } from "@/hooks/useTeam";
import { useInvitations } from "@/hooks/useInvitations";
import { Plus } from "lucide-react";

function MembersSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {Array.from({ length: 4 }).map((_, idx) => (
        <div key={idx} className="space-y-3 rounded-lg border bg-card p-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-4 w-3/5" />
          <Skeleton className="h-3 w-2/5" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}

const EMPTY_STATES = {
  members: {
    title: "Nenhum membro cadastrado",
    description:
      "Convide sua equipe para colaborar nas metas, leads e métricas da organização. Owners podem enviar convites por email.",
  },
};

export default function Team() {
  const { data: organization, isLoading: organizationLoading } = useActiveOrganization();
  const {
    members,
    isLoading: membersLoading,
    isOwner,
    currentUserId,
    removeMember,
    updateMemberRole,
    updateMemberUserType,
    removing,
    updatingRole,
    updatingUserType,
  } = useTeam();
  const {
    invitations,
    isLoading: invitationsLoading,
    resendInvitation,
    revokeInvitation,
    isSending,
    isRevoking,
    isResending,
  } = useInvitations();

  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const disableActions = !isOwner;

  const pendingProcessing = isRevoking || isResending || isSending;

  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      if (a.role === "owner") return -1;
      if (b.role === "owner") return 1;
      return a.profile.full_name.localeCompare(b.profile.full_name);
    });
  }, [members]);

  const handleRoleChange = (membershipId: string, role: typeof sortedMembers[number]["role"]) => {
    void updateMemberRole({ membershipId, role });
  };

  const handleUserTypeChange = (
    profileId: string,
    userType: typeof sortedMembers[number]["profile"]["user_type"],
  ) => {
    void updateMemberUserType({ profileId, userType });
  };

  const handleRemoveMember = (membershipId: string) => {
    void removeMember(membershipId);
  };

  return (
    <div className="space-y-8">
      <InviteMemberDialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen} />

      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Equipe</h1>
          <p className="text-sm text-muted-foreground">
            {organizationLoading
              ? "Carregando organização..."
              : organization
                ? `Gerencie membros e convites da organização ${organization.name}.`
                : "Associe-se a uma organização para habilitar convites e gestão de equipe."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setInviteDialogOpen(true)} disabled={!isOwner} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Convidar membro
          </Button>
        </div>
      </header>

      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members">Membros ({sortedMembers.length})</TabsTrigger>
          <TabsTrigger value="invitations">Convites pendentes ({invitations.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="mt-6 space-y-4">
          {membersLoading ? (
            <MembersSkeleton />
          ) : sortedMembers.length === 0 ? (
            <div className="rounded-lg border bg-background p-8 text-center">
              <h3 className="text-lg font-semibold">{EMPTY_STATES.members.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{EMPTY_STATES.members.description}</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {sortedMembers.map((member) => (
                <TeamMemberCard
                  key={member.membershipId}
                  member={member}
                  isCurrentUser={member.profile.id === currentUserId}
                  canManage={!disableActions}
                  isUpdatingRole={updatingRole}
                  isUpdatingUserType={updatingUserType}
                  isRemoving={removing}
                  onRoleChange={(role) => handleRoleChange(member.membershipId, role)}
                  onUserTypeChange={(userType) => handleUserTypeChange(member.profile.id, userType)}
                  onRemove={() => handleRemoveMember(member.membershipId)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="invitations" className="mt-6">
          {invitationsLoading ? (
            <MembersSkeleton />
          ) : (
            <PendingInvitationList
              invitations={invitations}
              onResend={(invitation) => void resendInvitation(invitation)}
              onRevoke={(invitationId) => void revokeInvitation(invitationId)}
              isProcessing={pendingProcessing}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
