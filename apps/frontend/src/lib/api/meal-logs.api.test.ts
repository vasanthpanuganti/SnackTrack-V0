import { beforeEach, describe, expect, it, vi } from "vitest";
import { mealLogsApi } from "./meal-logs.api";

const { getMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
}));

vi.mock("./client", () => ({
  apiClient: {
    get: getMock,
  },
}));

describe("mealLogsApi", () => {
  beforeEach(() => {
    getMock.mockReset();
  });

  it("unwraps paginated meal log responses to the item array", async () => {
    const mealLog = {
      id: "log-1",
      userId: "user-1",
      mealType: "breakfast",
      foodName: "Oatmeal",
      servings: 1,
      loggedAt: "2026-05-14T08:00:00.000Z",
      source: "manual",
    };

    getMock.mockResolvedValue({
      data: {
        status: "success",
        data: {
          items: [mealLog],
          nextCursor: null,
          hasMore: false,
        },
        error: null,
      },
    });

    await expect(
      mealLogsApi.getMealLogs({ date: "2026-05-14", range: "day" })
    ).resolves.toEqual([mealLog]);

    expect(getMock).toHaveBeenCalledWith("/meal-logs", {
      params: { date: "2026-05-14", range: "day" },
    });
  });
});
