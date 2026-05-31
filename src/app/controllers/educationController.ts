import * as educationModel from "../models/educationModel";

export async function loadEducationContent() {
  const [tips, comparisons, games] = await Promise.all([
    educationModel.getTips(),
    educationModel.getComparisons(),
    educationModel.getGames(),
  ]);

  return { tips, comparisons, games };
}
