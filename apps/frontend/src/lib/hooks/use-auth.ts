import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authApi } from "../api/auth.api";
import { useAuthStore } from "../store/auth-store";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function useAuth() {
  const { user, setAuth, clearAuth } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      setAuth(data.user, data.session.access_token, data.session.refresh_token);
      toast.success("Welcome back!");
      router.push("/dashboard");
    },
  });

  const signupMutation = useMutation({
    mutationFn: authApi.signup,
    onSuccess: (data) => {
      setAuth(data.user, data.session.access_token, data.session.refresh_token);
      toast.success("Account created successfully!");
      router.push("/dashboard");
    },
  });

  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
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
