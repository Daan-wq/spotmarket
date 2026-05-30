import { describe, expect, test } from "vitest";
import { shouldShowCampaignBudgetNotice } from "./campaign-display";

describe("shouldShowCampaignBudgetNotice", () => {
  test("shows the warning for active campaigns near the budget limit", () => {
    expect(
      shouldShowCampaignBudgetNotice({
        totalPaid: 450,
        totalBudget: 500,
        status: "active",
        deadline: "2999-01-01T00:00:00.000Z",
      }),
    ).toBe(true);
  });

  test("hides the warning once the campaign is displayed as ended", () => {
    expect(
      shouldShowCampaignBudgetNotice({
        totalPaid: 499,
        totalBudget: 500,
        status: "active",
        deadline: "2000-01-01T00:00:00.000Z",
      }),
    ).toBe(false);
    expect(
      shouldShowCampaignBudgetNotice({
        totalPaid: 500,
        totalBudget: 500,
        status: "completed",
        deadline: "2999-01-01T00:00:00.000Z",
      }),
    ).toBe(false);
  });
});
