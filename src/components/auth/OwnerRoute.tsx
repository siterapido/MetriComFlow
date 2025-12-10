import { Navigate } from "react-router-dom";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { Skeleton } from "@/components/ui/skeleton";

interface OwnerRouteProps {
    children: React.ReactNode;
}

export default function OwnerRoute({ children }: OwnerRouteProps) {
    const { data: permissions, isLoading } = useUserPermissions();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="space-y-4 w-full max-w-md">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-64 w-full" />
                    <Skeleton className="h-32 w-full" />
                </div>
            </div>
        );
    }

    if (!permissions?.isOwner) {
        return <Navigate to="/leads" replace />;
    }

    return <>{children}</>;
}
