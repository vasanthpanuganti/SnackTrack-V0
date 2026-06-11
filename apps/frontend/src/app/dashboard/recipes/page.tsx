"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChefHat, ChevronLeft, ChevronRight, Search } from "lucide-react";

import { useRecipes } from "@/lib/hooks/use-recipes";
import { RECIPE_DIET_FILTERS } from "@/lib/constants";
import { cn } from "@/lib/utils";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RecipeCard } from "@/components/recipes/recipe-card";
import { EmptyState } from "@/components/empty-state";
import { PageTransition, Stagger, StaggerItem } from "@/components/motion";

const PAGE_SIZE = 12;

function RecipesBrowser() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlSearch = searchParams.get("search") ?? "";

  const [searchInput, setSearchInput] = useState(urlSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(urlSearch);
  const [diet, setDiet] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  // Header search lands here via ?search= — keep local state in sync
  useEffect(() => {
    setSearchInput(urlSearch);
    setDebouncedSearch(urlSearch);
    setPage(1);
  }, [urlSearch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const filters = useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
      ...(diet ? { diet } : {}),
    }),
    [debouncedSearch, diet, page]
  );

  const { data, isLoading, isError, isFetching } = useRecipes(filters);
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  const toggleDiet = (value: string) => {
    setDiet((current) => (current === value ? null : value));
    setPage(1);
  };

  return (
    <PageTransition className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl md:text-4xl">Recipes</h1>
          <p className="mt-1 text-muted-foreground">
            Search thousands of dishes with full nutrition data.
          </p>
        </div>
        {isFetching && !isLoading && (
          <span className="text-xs text-muted-foreground">Updating…</span>
        )}
      </div>

      {/* Search + filters */}
      <div className="space-y-3">
        <div className="relative max-w-xl">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search for salmon, pasta, smoothie bowls…"
            className="h-11 rounded-full pl-10"
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              if (urlSearch && e.target.value !== urlSearch) {
                router.replace("/dashboard/recipes", { scroll: false });
              }
            }}
            aria-label="Search recipes"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {RECIPE_DIET_FILTERS.map((filter) => (
            <button
              key={filter.value}
              onClick={() => toggleDiet(filter.value)}
              aria-pressed={diet === filter.value}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                diet === filter.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-[4/3] rounded-2xl" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          icon={ChefHat}
          title="Couldn't load recipes"
          description="The kitchen seems unreachable. Check that the backend is running and try again."
        />
      ) : data?.recipes?.length ? (
        <>
          <Stagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {data.recipes.map((recipe, index) => (
              <StaggerItem key={recipe.id}>
                <RecipeCard recipe={recipe} priority={index < 3} />
              </StaggerItem>
            ))}
          </Stagger>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </Button>
              <span className="text-sm tabular-nums text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      ) : (
        <EmptyState
          icon={Search}
          title="No recipes found"
          description={
            debouncedSearch
              ? `Nothing matched “${debouncedSearch}”. Try a different search or clear the filters.`
              : "The catalog is empty — search for something to pull in fresh recipes."
          }
        />
      )}
    </PageTransition>
  );
}

export default function RecipesPage() {
  // useSearchParams requires a Suspense boundary during prerender
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full rounded-2xl" />}>
      <RecipesBrowser />
    </Suspense>
  );
}
