// Id the Navidad category was seeded with (server migration
// 20261125120100_seed_categories). Renaming it in the admin keeps this id.
export const CHRISTMAS_CATEGORY_ID = 'christmas';

/**
 * From 15 November to 6 January (Reyes) inclusive, the site shows its
 * Christmas touches: snow over the hero and a link to the Navidad category.
 * Outside that window nothing changes, so there is nothing to undo in January.
 */
export function isChristmasSeason(now: Date = new Date()): boolean {
  const month = now.getMonth(); // 0 = January
  const day = now.getDate();
  return (month === 10 && day >= 15) || month === 11 || (month === 0 && day <= 6);
}
