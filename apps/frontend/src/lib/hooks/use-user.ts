import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usersApi } from "../api/users.api";
import { toast } from "sonner";
import { useAuthStore } from "../store/auth-store";

export function useUserProfile() {
  return useQuery({
    queryKey: ["user", "profile"],
    queryFn: usersApi.getProfile,
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

export function useUserPreferences() {
  return useQuery({
    queryKey: ["user", "preferences"],
    queryFn: usersApi.getPreferences,
  });
}

export function useUpdatePreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: usersApi.updatePreferences,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user", "preferences"] });
      toast.success("Preferences updated!");
    },
  });
}

export function useUserAllergens() {
  return useQuery({
    queryKey: ["user", "allergens"],
    queryFn: usersApi.getAllergens,
  });
}

export function useAddAllergen() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: usersApi.addAllergen,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user", "allergens"] });
      toast.success("Allergen added");
    },
  });
}

export function useRemoveAllergen() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: usersApi.removeAllergen,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user", "allergens"] });
      toast.success("Allergen removed");
    },
  });
}
