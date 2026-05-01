// Source-of-truth slug lists for /vs/[competitor] (cars) and
// /boats/vs/[competitor] (boats). The actual page-rendering comparison
// data still lives in the page files since it's mostly copy/CMS — but
// the slug list is shared with sitemap.ts so new comparisons
// automatically end up crawled.
//
// Add a new comparison? Add the slug here AND its case in the page
// file's COMPARISONS array. Build will tree-shake unused exports.

export const CARS_VS_SLUGS = ["turo", "marengo", "supercar-club"] as const;

export const BOATS_VS_SLUGS = ["boatsetter", "yacht-club", "solo-ownership"] as const;

export type CarsVsSlug = (typeof CARS_VS_SLUGS)[number];
export type BoatsVsSlug = (typeof BOATS_VS_SLUGS)[number];
