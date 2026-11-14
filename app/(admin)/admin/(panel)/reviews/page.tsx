import type { Metadata } from "next";
import { getReviewsAdmin } from "@/lib/admin/queries/home";
import { PageHeader } from "@/components/admin/AdminShell";
import ReviewsManager from "@/components/admin/home/ReviewsManager";

export const metadata: Metadata = { title: "Reviews" };

export default async function ReviewsPage() {
  const { section, reviews, posts } = await getReviewsAdmin();
  return (
    <>
      <PageHeader
        title="Reviews"
        description="Kind words, in their homes: customer reviews and the Instagram tiles under them."
      />
      <ReviewsManager section={section} reviews={reviews} posts={posts} />
    </>
  );
}
