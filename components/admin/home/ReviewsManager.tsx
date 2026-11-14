"use client";

import { useState } from "react";
import { ImageOff, Pencil, Plus, Star } from "lucide-react";
import type { AdminPost, AdminReview, AdminSection } from "@/lib/admin/queries/home";
import {
  deletePost,
  deleteReview,
  reorderPosts,
  reorderReviews,
  savePost,
  saveReview,
  saveReviewsSection,
} from "@/lib/admin/home";
import {
  postSchema,
  reviewSchema,
  reviewsSectionSchema,
  type PostInput,
  type ReviewInput,
  type ReviewsSectionInput,
} from "@/lib/admin/schemas/home";
import { fieldErrorsOf } from "@/lib/admin/schemas/catalogue";
import { REVIEW_ACCENTS } from "@/lib/home-defaults";
import { cn } from "@/lib/utils";
import { DragHandle, SortableList } from "@/components/admin/SortableList";
import { Badge } from "@/components/admin/ui/badge";
import { Button } from "@/components/admin/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/admin/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/admin/ui/dialog";
import { Input } from "@/components/admin/ui/input";
import { Switch } from "@/components/admin/ui/switch";
import { Textarea } from "@/components/admin/ui/textarea";
import {
  ColourInput,
  ConfirmButton,
  EmptyState,
  Field,
  ImageField,
  SavingIcon,
  firstErrors,
  useActionRunner,
  type ImageValue,
} from "@/components/admin/catalogue/shared";

export default function ReviewsManager({
  section,
  reviews,
  posts,
}: {
  section: AdminSection;
  reviews: AdminReview[];
  posts: AdminPost[];
}) {
  return (
    <div className="grid max-w-4xl gap-6">
      <SectionCard initial={section} />
      <ReviewsList reviews={reviews} />
      <PostsList posts={posts} />
    </div>
  );
}

// ---------- Section copy ----------

function SectionCard({ initial }: { initial: AdminSection }) {
  const [v, setV] = useState<ReviewsSectionInput>({
    eyebrow: initial.eyebrow,
    heading: initial.heading,
    headingEmphasis: initial.headingEmphasis,
    handle: initial.handle,
    profileUrl: initial.ctaUrl,
    active: initial.active,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, run] = useActionRunner();
  const set = <K extends keyof ReviewsSectionInput>(k: K, value: ReviewsSectionInput[K]) =>
    setV((s) => ({ ...s, [k]: value }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = reviewsSectionSchema.safeParse(v);
    if (!parsed.success) return setErrors(fieldErrorsOf(parsed.error));
    setErrors({});
    run(() => saveReviewsSection(parsed.data), {
      success: "Reviews section saved",
      onError: (r) => setErrors(firstErrors(r.fieldErrors)),
    });
  }

  return (
    <form onSubmit={submit} noValidate>
      <Card>
        <CardHeader>
          <CardTitle>Section heading and Instagram</CardTitle>
          <CardDescription>
            The whole section stays off the home page until it has at least one review, Instagram tile or handle.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <label htmlFor="reviews-active" className="flex items-center gap-2 text-sm">
            <Switch id="reviews-active" checked={v.active} onCheckedChange={(a) => set("active", a)} /> Shown on the home
            page
          </label>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Small label" htmlFor="reviews-eyebrow" error={errors.eyebrow}>
              <Input id="reviews-eyebrow" value={v.eyebrow} onChange={(e) => set("eyebrow", e.target.value)} />
            </Field>
            <Field label="Heading" htmlFor="reviews-heading" error={errors.heading}>
              <Input id="reviews-heading" value={v.heading} onChange={(e) => set("heading", e.target.value)} />
            </Field>
            <Field label="Heading, in italics" htmlFor="reviews-emphasis" error={errors.headingEmphasis}>
              <Input
                id="reviews-emphasis"
                value={v.headingEmphasis}
                onChange={(e) => set("headingEmphasis", e.target.value)}
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Instagram handle" htmlFor="reviews-handle" error={errors.handle} hint="Without the @. Empty hides the Instagram bar.">
              <Input id="reviews-handle" value={v.handle} onChange={(e) => set("handle", e.target.value)} />
            </Field>
            <Field
              label="Instagram profile link"
              htmlFor="reviews-url"
              error={errors.profileUrl}
              hint="Adds the “Follow on Instagram” button."
            >
              <Input
                id="reviews-url"
                placeholder="https://www.instagram.com/…"
                value={v.profileUrl}
                onChange={(e) => set("profileUrl", e.target.value)}
              />
            </Field>
          </div>
          <div>
            <Button type="submit" disabled={pending}>
              <SavingIcon pending={pending} /> Save
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}

// ---------- Reviews ----------

type ReviewDraft = {
  id?: string;
  image: ImageValue;
  customerName: string;
  location: string;
  quote: string;
  rating: number | null;
  accentColour: string;
  active: boolean;
};

const blankReview = (): ReviewDraft => ({
  image: null,
  customerName: "",
  location: "",
  quote: "",
  rating: 5,
  accentColour: REVIEW_ACCENTS[0],
  active: true,
});

const reviewToDraft = (r: AdminReview): ReviewDraft => ({
  id: r.id,
  image: r.imageId && r.imageUrl ? { id: r.imageId, url: r.imageUrl } : null,
  customerName: r.customerName,
  location: r.location,
  quote: r.quote,
  rating: r.rating,
  accentColour: r.accentColour,
  active: r.active,
});

const reviewInput = (d: ReviewDraft): ReviewInput => ({
  id: d.id,
  imageId: d.image?.id ?? null,
  customerName: d.customerName,
  location: d.location,
  quote: d.quote,
  rating: d.rating,
  accentColour: d.accentColour,
  active: d.active,
});

function Thumb({ url, className }: { url: string | null; className?: string }) {
  return (
    <div className={cn("flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted", className)}>
      {url ? <img src={url} alt="" className="size-full object-cover" /> : <ImageOff className="size-4 text-muted-foreground" />}
    </div>
  );
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex" role="img" aria-label={`${rating} out of 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className={cn("size-3.5", i < rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40")} />
      ))}
    </span>
  );
}

function ReviewsList({ reviews }: { reviews: AdminReview[] }) {
  const [editing, setEditing] = useState<ReviewDraft | null>(null);
  const [, run] = useActionRunner();

  const addButton = (
    <Button onClick={() => setEditing(blankReview())}>
      <Plus /> Add review
    </Button>
  );

  return (
    <section className="grid gap-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Reviews</h2>
          <p className="text-sm text-muted-foreground">
            Customer screenshots or photos with who said it. Drag to reorder; the first ones show first.
          </p>
        </div>
        {reviews.length > 0 && addButton}
      </div>

      {reviews.length === 0 ? (
        <EmptyState
          title="No reviews yet"
          description="Upload a screenshot or photo of a kind message, and add the customer's name."
          action={addButton}
        />
      ) : (
        <SortableList
          items={reviews}
          className="gap-3"
          onReorder={(ids) => run(() => reorderReviews({ ids }), { success: "Order saved" })}
          renderItem={(r, handle) => (
            <div className="flex items-center gap-3 rounded-lg border bg-card p-2 pr-3">
              <DragHandle {...handle} />
              <Thumb url={r.imageUrl} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-semibold">{r.customerName || "Unnamed customer"}</span>
                  {r.location && <span className="text-sm text-muted-foreground">{r.location}</span>}
                  {r.rating ? <Stars rating={r.rating} /> : null}
                  {!r.active && <Badge variant="secondary">Hidden</Badge>}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {r.quote ? `“${r.quote}”` : r.imageUrl ? "Screenshot only" : "Empty"}
                </div>
              </div>
              <Switch
                checked={r.active}
                aria-label={r.active ? "Hide review" : "Show review"}
                onCheckedChange={(active) =>
                  run(() => saveReview({ ...reviewInput(reviewToDraft(r)), active }), {
                    success: active ? "Review is live" : "Review is hidden",
                  })
                }
              />
              <Button variant="ghost" size="icon-sm" aria-label="Edit review" onClick={() => setEditing(reviewToDraft(r))}>
                <Pencil />
              </Button>
              <ConfirmButton
                label="Delete review"
                title="Delete this review?"
                description="This can't be undone."
                onConfirm={() => run(() => deleteReview({ id: r.id }), { success: "Review deleted" })}
              />
            </div>
          )}
        />
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          {editing && <ReviewForm key={editing.id ?? "new"} initial={editing} onDone={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>
    </section>
  );
}

function ReviewForm({ initial, onDone }: { initial: ReviewDraft; onDone: () => void }) {
  const [d, setD] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, run] = useActionRunner();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = reviewSchema.safeParse(reviewInput(d));
    if (!parsed.success) return setErrors(fieldErrorsOf(parsed.error));
    setErrors({});
    run(() => saveReview(parsed.data), {
      success: d.id ? "Review saved" : "Review added",
      onSuccess: onDone,
      onError: (r) => setErrors(firstErrors(r.fieldErrors)),
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <DialogHeader>
        <DialogTitle>{d.id ? "Edit review" : "Add review"}</DialogTitle>
        <DialogDescription>Add a photo or screenshot, a quote, or both.</DialogDescription>
      </DialogHeader>
      <Field label="Photo or screenshot" error={errors.imageId} hint="Shown 4:5 without cropping.">
        <ImageField value={d.image} onChange={(image) => setD({ ...d, image })} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Customer name" htmlFor="rv-name" error={errors.customerName}>
          <Input id="rv-name" value={d.customerName} onChange={(e) => setD({ ...d, customerName: e.target.value })} />
        </Field>
        <Field label="City or place" htmlFor="rv-loc" error={errors.location} hint="Shown after the name.">
          <Input id="rv-loc" value={d.location} onChange={(e) => setD({ ...d, location: e.target.value })} />
        </Field>
      </div>
      <Field label="Quote" htmlFor="rv-quote" error={errors.quote} hint="Optional when there is a photo.">
        <Textarea id="rv-quote" rows={3} value={d.quote} onChange={(e) => setD({ ...d, quote: e.target.value })} />
      </Field>
      <Field label="Stars" error={errors.rating}>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              aria-label={`${n} star${n === 1 ? "" : "s"}`}
              aria-pressed={d.rating === n}
              onClick={() => setD({ ...d, rating: n })}
              className="rounded p-0.5 hover:bg-muted"
            >
              <Star className={cn("size-6", d.rating !== null && n <= d.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40")} />
            </button>
          ))}
          {d.rating !== null && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setD({ ...d, rating: null })}>
              No stars
            </Button>
          )}
        </div>
      </Field>
      <Field label="Quote mark colour" htmlFor="rv-accent" error={errors.accentColour} hint="On cards that have no photo.">
        <ColourInput
          id="rv-accent"
          value={d.accentColour}
          onChange={(accentColour) => setD({ ...d, accentColour })}
          invalid={!!errors.accentColour}
        />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <Switch checked={d.active} onCheckedChange={(active) => setD({ ...d, active })} /> Shown on the home page
      </label>
      <DialogFooter>
        <Button type="submit" disabled={pending}>
          <SavingIcon pending={pending} /> Save
        </Button>
      </DialogFooter>
    </form>
  );
}

// ---------- Instagram tiles ----------

type PostDraft = { id?: string; image: ImageValue; linkUrl: string; caption: string; active: boolean };

const blankPost = (): PostDraft => ({ image: null, linkUrl: "", caption: "", active: true });
const postToDraft = (p: AdminPost): PostDraft => ({
  id: p.id,
  image: p.imageId && p.imageUrl ? { id: p.imageId, url: p.imageUrl } : null,
  linkUrl: p.linkUrl,
  caption: p.caption,
  active: p.active,
});
const postInput = (d: PostDraft): PostInput => ({
  id: d.id,
  imageId: d.image?.id ?? null,
  linkUrl: d.linkUrl,
  caption: d.caption,
  active: d.active,
});

function PostsList({ posts }: { posts: AdminPost[] }) {
  const [editing, setEditing] = useState<PostDraft | null>(null);
  const [, run] = useActionRunner();

  const addButton = (
    <Button onClick={() => setEditing(blankPost())}>
      <Plus /> Add tile
    </Button>
  );

  return (
    <section className="grid gap-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Instagram tiles</h2>
          <p className="text-sm text-muted-foreground">
            The square photos under the reviews. Each can link to its Instagram post.
          </p>
        </div>
        {posts.length > 0 && addButton}
      </div>

      {posts.length === 0 ? (
        <EmptyState title="No tiles yet" description="Upload a few square photos from your Instagram." action={addButton} />
      ) : (
        <SortableList
          items={posts}
          className="gap-3"
          onReorder={(ids) => run(() => reorderPosts({ ids }), { success: "Order saved" })}
          renderItem={(p, handle) => (
            <div className="flex items-center gap-3 rounded-lg border bg-card p-2 pr-3">
              <DragHandle {...handle} />
              <Thumb url={p.imageUrl} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-medium">{p.caption || "No description"}</span>
                  {!p.active && <Badge variant="secondary">Hidden</Badge>}
                </div>
                <div className="truncate text-xs text-muted-foreground">{p.linkUrl || "Doesn't link anywhere"}</div>
              </div>
              <Switch
                checked={p.active}
                aria-label={p.active ? "Hide tile" : "Show tile"}
                onCheckedChange={(active) =>
                  run(() => savePost({ ...postInput(postToDraft(p)), active }), {
                    success: active ? "Tile is live" : "Tile is hidden",
                  })
                }
              />
              <Button variant="ghost" size="icon-sm" aria-label="Edit tile" onClick={() => setEditing(postToDraft(p))}>
                <Pencil />
              </Button>
              <ConfirmButton
                label="Delete tile"
                title="Delete this tile?"
                description="This can't be undone."
                onConfirm={() => run(() => deletePost({ id: p.id }), { success: "Tile deleted" })}
              />
            </div>
          )}
        />
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-lg">
          {editing && <PostForm key={editing.id ?? "new"} initial={editing} onDone={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>
    </section>
  );
}

function PostForm({ initial, onDone }: { initial: PostDraft; onDone: () => void }) {
  const [d, setD] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, run] = useActionRunner();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = postSchema.safeParse(postInput(d));
    if (!parsed.success) return setErrors(fieldErrorsOf(parsed.error));
    setErrors({});
    run(() => savePost(parsed.data), {
      success: d.id ? "Tile saved" : "Tile added",
      onSuccess: onDone,
      onError: (r) => setErrors(firstErrors(r.fieldErrors)),
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <DialogHeader>
        <DialogTitle>{d.id ? "Edit tile" : "Add tile"}</DialogTitle>
        <DialogDescription>Shown as a square, so a square photo works best.</DialogDescription>
      </DialogHeader>
      <Field label="Photo" error={errors.imageId}>
        <ImageField value={d.image} onChange={(image) => setD({ ...d, image })} />
      </Field>
      <Field label="Link to the post" htmlFor="post-link" error={errors.linkUrl} hint="Optional. A full https:// link.">
        <Input
          id="post-link"
          placeholder="https://www.instagram.com/p/…"
          value={d.linkUrl}
          onChange={(e) => setD({ ...d, linkUrl: e.target.value })}
        />
      </Field>
      <Field label="Description" htmlFor="post-caption" error={errors.caption} hint="Read out by screen readers.">
        <Input id="post-caption" value={d.caption} onChange={(e) => setD({ ...d, caption: e.target.value })} />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <Switch checked={d.active} onCheckedChange={(active) => setD({ ...d, active })} /> Shown on the home page
      </label>
      <DialogFooter>
        <Button type="submit" disabled={pending}>
          <SavingIcon pending={pending} /> Save
        </Button>
      </DialogFooter>
    </form>
  );
}
