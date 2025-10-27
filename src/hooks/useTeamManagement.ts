import { useMemo, useState } from "react";
import { useTeam, type TeamMember } from "./useTeam";
import { useInvitations, type TeamInvitation } from "./useInvitations";
import { useActiveOrganization } from "./useActiveOrganization";

export type MemberFilter = "all" | "owner" | "admin" | "manager" | "member";
export type UserTypeFilter = "all" | "owner" | "traffic_manager" | "sales";

export interface TeamManagementFilters {
  search: string;
  roleFilter: MemberFilter;
  userTypeFilter: UserTypeFilter;
}

/**
 * Hook unificado para gerenciamento completo de equipe
 * Combina membros ativos, convites pendentes, e funcionalidades de busca/filtro
 */
export function useTeamManagement() {
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
    sendInvitation,
    resendInvitation,
    revokeInvitation,
    isSending,
    isRevoking,
    isResending,
  } = useInvitations();

  // Local filters state
  const [filters, setFilters] = useState<TeamManagementFilters>({
    search: "",
    roleFilter: "all",
    userTypeFilter: "all",
  });

  // Sorted members (owners first)
  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      if (a.role === "owner") return -1;
      if (b.role === "owner") return 1;
      return a.profile.full_name.localeCompare(b.profile.full_name);
    });
  }, [members]);

  // Filtered members based on search and filters
  const filteredMembers = useMemo(() => {
    let result = sortedMembers;

    // Search filter (name or email)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(
        (member) =>
          member.profile.full_name.toLowerCase().includes(searchLower) ||
          member.profile.email.toLowerCase().includes(searchLower)
      );
    }

    // Role filter
    if (filters.roleFilter !== "all") {
      result = result.filter((member) => member.role === filters.roleFilter);
    }

    // User type filter
    if (filters.userTypeFilter !== "all") {
      result = result.filter((member) => member.profile.user_type === filters.userTypeFilter);
    }

    return result;
  }, [sortedMembers, filters]);

  // Group members by role for categorized view
  const membersByRole = useMemo(() => {
    const grouped: Record<TeamMember["role"], TeamMember[]> = {
      owner: [],
      admin: [],
      manager: [],
      member: [],
    };

    filteredMembers.forEach((member) => {
      grouped[member.role].push(member);
    });

    return grouped;
  }, [filteredMembers]);

  // Group members by user type
  const membersByUserType = useMemo(() => {
    const grouped: Record<string, TeamMember[]> = {
      owner: [],
      traffic_manager: [],
      sales: [],
    };

    filteredMembers.forEach((member) => {
      if (grouped[member.profile.user_type]) {
        grouped[member.profile.user_type].push(member);
      }
    });

    return grouped;
  }, [filteredMembers]);

  // Statistics
  const stats = useMemo(() => {
    const totalMembers = members.length;
    const pendingInvitations = invitations.length;
    const ownerCount = members.filter((m) => m.role === "owner").length;
    const adminCount = members.filter((m) => m.role === "admin").length;
    const managerCount = members.filter((m) => m.role === "manager").length;
    const memberCount = members.filter((m) => m.role === "member").length;

    return {
      totalMembers,
      pendingInvitations,
      totalUsersAndInvitations: totalMembers + pendingInvitations,
      byRole: {
        owner: ownerCount,
        admin: adminCount,
        manager: managerCount,
        member: memberCount,
      },
      byUserType: {
        owner: members.filter((m) => m.profile.user_type === "owner").length,
        traffic_manager: members.filter((m) => m.profile.user_type === "traffic_manager").length,
        sales: members.filter((m) => m.profile.user_type === "sales").length,
      },
    };
  }, [members, invitations]);

  // Update filter helpers
  const setSearch = (search: string) => {
    setFilters((prev) => ({ ...prev, search }));
  };

  const setRoleFilter = (roleFilter: MemberFilter) => {
    setFilters((prev) => ({ ...prev, roleFilter }));
  };

  const setUserTypeFilter = (userTypeFilter: UserTypeFilter) => {
    setFilters((prev) => ({ ...prev, userTypeFilter }));
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      roleFilter: "all",
      userTypeFilter: "all",
    });
  };

  const isLoading = membersLoading || invitationsLoading || organizationLoading;
  const isProcessing = removing || updatingRole || updatingUserType || isSending || isRevoking || isResending;

  return {
    // Organization
    organization,
    organizationLoading,

    // Members
    members: filteredMembers,
    allMembers: sortedMembers,
    membersByRole,
    membersByUserType,
    membersLoading,

    // Invitations
    invitations,
    invitationsLoading,

    // Permissions
    isOwner,
    currentUserId,

    // Actions
    removeMember,
    updateMemberRole,
    updateMemberUserType,
    sendInvitation,
    resendInvitation,
    revokeInvitation,

    // State flags
    isLoading,
    isProcessing,
    removing,
    updatingRole,
    updatingUserType,
    isSending,
    isRevoking,
    isResending,

    // Filters
    filters,
    setSearch,
    setRoleFilter,
    setUserTypeFilter,
    clearFilters,

    // Statistics
    stats,
  };
}
