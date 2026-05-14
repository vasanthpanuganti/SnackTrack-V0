import { beforeEach, describe, expect, it, vi } from "vitest";
import { recipesApi } from "./recipes.api";

const { getMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
}));

vi.mock("./client", () => ({
  apiClient: {
    get: getMock,
  },
}));

describe("recipesApi", () => {
  beforeEach(() => {
    getMock.mockReset();
    getMock.mockResolvedValue({
      data: {
        status: "success",
        data: {
          recipes: [],
          total: 0,
          page: 1,
          limit: 12,
        },
        error: null,
      },
    });
  });

  it("loads cached recipes from the list endpoint when no search is present", async () => {
    await recipesApi.getRecipes({ page: 1, limit: 12 });

    expect(getMock).toHaveBeenCalledWith("/recipes", {
      params: { page: 1, limit: 12 },
    });
  });

  it("routes searched recipe browsing through the search endpoint", async () => {
    await recipesApi.getRecipes({ search: "salad", page: 1, limit: 12 });

    expect(getMock).toHaveBeenCalledWith("/recipes/search", {
      params: { q: "salad", page: 1, limit: 12 },
    });
  });
});
