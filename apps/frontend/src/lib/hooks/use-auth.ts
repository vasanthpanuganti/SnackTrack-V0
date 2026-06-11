import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authApi, type AuthResult } from "../api/auth.api";
import { useAuthStore } from "../store/auth-store";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function useAuth() {
  const { user, setAuth, clearAuth, updateUser } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();

  // Auth endpoints return a minimal user; hydrate the full profile right
  // after so the dashboard greets the user by name without a flash.
  const completeSignIn = async (data: AuthResult) => {
    setAuth(data.user, data.tokens.accessToken, data.tokens.refreshToken);
    try {
      const profile = await authApi.getCurrentUser();
      updateUser(profile);
    } catch {
      // Non-fatal: profile loads lazily on the dashboard
    }
  };

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: async (data) => {
      await completeSignIn(data);
      toast.success("Welcome back!");
      router.push("/dashboard");
    },
  });

  const signupMutation = useMutation({
    mutationFn: authApi.signup,
    onSuccess: async (data) => {
      await completeSignIn(data);
      toast.success("Account created — welcome to SnackTrack!");
      router.push("/dashboard");
    },
  });

  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      // Always clear local state, even if the server call failed
      clearAuth();
      queryClient.clear();
      toast.success("Logged out successfully");
      router.push("/login");
    },
  });

  return {
    user,
    isAuthenticated: !!user,
    login: loginMutation.mutate,
    signup: signupMutation.mutate,
    logout: logoutMutation.mutate,
    isLoading:
      loginMutation.isPending ||
      signupMutation.isPending ||
      logoutMutation.isPending,
  };
}

export function useCurrentUser() {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: ["user", "me"],
    queryFn: authApi.getCurrentUser,
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
