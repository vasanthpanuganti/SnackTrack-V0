"use client";

import { useEffect, useMemo, useState } from "react";
import { useRecipes } from "@/lib/hooks/use-recipes";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Clock, Flame } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function RecipesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const filters = useMemo(
    () => ({
      page: 1,
      limit: 12,
      ...(debouncedSearchQuery ? { search: debouncedSearchQuery } : {}),
    }),
    [debouncedSearchQuery]
  );
  const { data, isLoading, error, isFetching } = useRecipes(filters);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Recipes</h1>
        <p className="text-muted-foreground">
          Discover delicious and healthy recipes tailored to your preferences
        </p>
        {isFetching && !isLoading ? (
          <p className="text-xs text-muted-foreground mt-2">Updating recipes...</p>
        ) : null}
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search for recipes..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" size="sm">Vegetarian</Button>
            <Button variant="outline" size="sm">Vegan</Button>
            <Button variant="outline" size="sm">Gluten Free</Button>
            <Button variant="outline" size="sm">Low Carb</Button>
          </div>
        </CardContent>
      </Card>

      {/* Recipe Grid */}
      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="h-48 w-full" />
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Failed to load recipes. Make sure the backend is running.
            </p>
          </CardContent>
        </Card>
      ) : data?.recipes?.length ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {data.recipes.map((recipe) => (
            <Link key={recipe.id} href={`/dashboard/recipes/${recipe.id}`}>
              <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full">
                <div className="relative h-48 bg-muted">
                  {recipe.imageUrl ? (
                    <Image
                      src={recipe.imageUrl}
                      alt={recipe.title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      No Image
                    </div>
                  )}
                </div>
                <CardHeader>
                  <CardTitle className="line-clamp-2">{recipe.title}</CardTitle>
                  <CardDescription className="flex items-center gap-4 text-xs">
                    {recipe.readyInMinutes && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {recipe.readyInMinutes} min
                      </span>
                    )}
                    {recipe.calories && (
                      <span className="flex items-center gap-1">
                        <Flame className="h-3 w-3" />
                        {Math.round(recipe.calories)} cal
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No recipes found. Try adjusting your filters.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
