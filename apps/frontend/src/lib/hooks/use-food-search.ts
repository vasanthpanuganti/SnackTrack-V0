import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { foodApi } from "../api/food.api";

export function useFoodSearch(query: string, limit = 8) {
  return useQuery({
    queryKey: ["food", "search", query, limit],
    queryFn: () => foodApi.search(query, limit),
    enabled: query.trim().length > 1,
    staleTime: 10 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}
