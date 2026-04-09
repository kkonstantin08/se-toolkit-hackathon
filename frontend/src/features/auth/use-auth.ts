import { useMutation, useQuery } from "@tanstack/react-query";

import { api, ApiError } from "../../lib/api/client";
import { queryClient } from "../../app/query-client";

export function useCurrentUser() {
  return useQuery({
    queryKey: ["me"],
    queryFn: api.me,
    retry: false,
  });
}

export function useLogin() {
  return useMutation({
    mutationFn: api.login,
    onSuccess: (user) => {
      queryClient.setQueryData(["me"], user);
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: api.register,
    onSuccess: (user) => {
      queryClient.setQueryData(["me"], user);
    },
  });
}

export function useLogout() {
  return useMutation({
    mutationFn: api.logout,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      queryClient.clear();
    },
  });
}

export function isUnauthorized(error: unknown) {
  return error instanceof ApiError && error.status === 401;
}
