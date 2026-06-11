import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usersApi, type AllergenInput } from "../api/users.api";
import { toast } from "sonner";
import { useAuthStore } from "../store/auth-store";

export function useUserProfile() {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: ["user", "profile"],
    queryFn: usersApi.getProfile,
    enabled: !!user,
    staleTime: 60 * 1000,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { updateUser } = useAuthStore();

  return useMutation({
    mutationFn: usersApi.updateProfile,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["user"] });
      updateUser(data);
      toast.success("Profile updated successfully!");
    },
  });
}

export function useUpdatePreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: usersApi.updatePreferences,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user"] });
      // Targets changed — nutrition percentages must recompute
      queryClient.invalidateQueries({ queryKey: ["nutrition"] });
      toast.success("Preferences updated!");
    },
  });
}

export function useReplaceAllergens() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (allergens: AllergenInput[]) =>
      usersApi.replaceAllergens(allergens),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user"] });
      // Allergen changes affect which recipes are shown as safe
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      toast.success("Allergens updated");
    },
  });
}
