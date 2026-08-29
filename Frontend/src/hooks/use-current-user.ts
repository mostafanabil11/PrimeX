import { useQuery } from "@tanstack/react-query";
import { getProfile } from "@/lib/api/auth";

export function useCurrentUser() {
  return useQuery({
    queryKey: ["auth", "profile"],
    queryFn: getProfile,
    retry: false,
  });
}
