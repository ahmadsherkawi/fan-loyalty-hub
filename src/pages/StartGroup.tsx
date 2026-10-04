import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

/** /start-group — the link sent to supporters' club organisers: sign up (if needed), then straight into "Create a group". */
export default function StartGroup() {
  const { user, loading } = useAuth();
  if (loading) return null;
  const target = "/groups?create=1";
  return <Navigate to={user ? target : `/auth?mode=signup&next=${encodeURIComponent(target)}`} replace />;
}
