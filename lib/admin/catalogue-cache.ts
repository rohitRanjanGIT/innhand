import "server-only";
import { refresh, updateTag } from "next/cache";
import { TAGS } from "@/lib/cache-tags";

// Called at the end of every catalogue setup Server Action: expires the storefront's cached reads
// for the given tags and refreshes the admin page the owner is on.

type Area = "settings" | "colours" | "finishes" | "categories" | "tags" | "nav";

const TAGS_FOR: Record<Area, string[]> = {
  settings: [TAGS.settings],
  colours: [TAGS.finishes, TAGS.products],
  finishes: [TAGS.finishes, TAGS.products],
  categories: [TAGS.categories, TAGS.nav, TAGS.products],
  tags: [TAGS.products, TAGS.nav],
  nav: [TAGS.nav],
};

export function changed(area: Area) {
  for (const tag of TAGS_FOR[area]) updateTag(tag);
  refresh();
}
