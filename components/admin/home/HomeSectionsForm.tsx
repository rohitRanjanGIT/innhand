"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import type { AdminSection } from "@/lib/admin/queries/home";
import { saveProcessSection, saveStorySection } from "@/lib/admin/home";
import {
  processSectionSchema,
  storySectionSchema,
  type ProcessSectionInput,
  type StorySectionInput,
} from "@/lib/admin/schemas/home";
import { fieldErrorsOf } from "@/lib/admin/schemas/catalogue";
import { MAX_STEPS } from "@/lib/home-defaults";
import { Button } from "@/components/admin/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/admin/ui/card";
import { Input } from "@/components/admin/ui/input";
import { Switch } from "@/components/admin/ui/switch";
import { Textarea } from "@/components/admin/ui/textarea";
import { Field, ImageField, SavingIcon, firstErrors, useActionRunner } from "@/components/admin/catalogue/shared";
import VideoField from "./VideoField";

export default function HomeSectionsForm({ process, story }: { process: AdminSection; story: AdminSection }) {
  return (
    <div className="grid max-w-3xl gap-6">
      <ProcessCard initial={process} />
      <StoryCard initial={story} />
    </div>
  );
}

/** The switch in a card's header: a hidden section is skipped on the home page. */
function ActiveSwitch({ id, checked, onChange }: { id: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label htmlFor={id} className="flex items-center gap-2 text-sm font-normal">
      <Switch id={id} checked={checked} onCheckedChange={onChange} /> Shown on the home page
    </label>
  );
}

// ---------- The process: "Made by Hand" ----------

function ProcessCard({ initial }: { initial: AdminSection }) {
  const [v, setV] = useState<ProcessSectionInput>({
    eyebrow: initial.eyebrow,
    heading: initial.heading,
    headingEmphasis: initial.headingEmphasis,
    body: initial.body,
    steps: initial.steps,
    videoKey: initial.videoKey,
    imageId: initial.image?.id ?? null,
    active: initial.active,
  });
  // The cover's thumbnail URL, kept beside its id (the schema only carries the id).
  const [cover, setCover] = useState(initial.image);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, run] = useActionRunner();
  const set = <K extends keyof ProcessSectionInput>(k: K, value: ProcessSectionInput[K]) =>
    setV((s) => ({ ...s, [k]: value }));
  const steps = v.steps;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = processSectionSchema.safeParse(v);
    if (!parsed.success) return setErrors(fieldErrorsOf(parsed.error));
    setErrors({});
    run(() => saveProcessSection(parsed.data), {
      success: "Process section saved",
      onError: (r) => setErrors(firstErrors(r.fieldErrors)),
    });
  }

  return (
    <form onSubmit={submit} noValidate>
      <Card>
        <CardHeader>
          <CardTitle>The process: Made by Hand</CardTitle>
          <CardDescription>
            The section under the hero with the making-of video. Without a video it shows the cover image, or a
            placeholder if there is neither.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <ActiveSwitch id="process-active" checked={v.active} onChange={(a) => set("active", a)} />
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Small label" htmlFor="process-eyebrow" error={errors.eyebrow}>
              <Input id="process-eyebrow" value={v.eyebrow} onChange={(e) => set("eyebrow", e.target.value)} />
            </Field>
            <Field label="Heading" htmlFor="process-heading" error={errors.heading}>
              <Input id="process-heading" value={v.heading} onChange={(e) => set("heading", e.target.value)} />
            </Field>
            <Field label="Heading, in italics" htmlFor="process-emphasis" error={errors.headingEmphasis}>
              <Input
                id="process-emphasis"
                value={v.headingEmphasis}
                onChange={(e) => set("headingEmphasis", e.target.value)}
              />
            </Field>
          </div>
          <Field label="Text" htmlFor="process-body" error={errors.body}>
            <Textarea id="process-body" rows={2} value={v.body} onChange={(e) => set("body", e.target.value)} />
          </Field>

          <Field label="Steps" error={errors.steps} hint={`Numbered 01, 02… under the text. Up to ${MAX_STEPS}.`}>
            <div className="grid gap-2">
              {steps.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-6 text-sm text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                  <Input
                    aria-label={`Step ${i + 1}`}
                    value={s}
                    aria-invalid={errors[`steps.${i}`] ? true : undefined}
                    onChange={(e) => set("steps", steps.map((x, j) => (j === i ? e.target.value : x)))}
                    className="max-w-xs"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove step ${i + 1}`}
                    onClick={() => set("steps", steps.filter((_, j) => j !== i))}
                  >
                    <X />
                  </Button>
                  {errors[`steps.${i}`] && <span className="text-sm text-destructive">{errors[`steps.${i}`]}</span>}
                </div>
              ))}
              {steps.length < MAX_STEPS && (
                <div>
                  <Button type="button" variant="outline" size="sm" onClick={() => set("steps", [...steps, ""])}>
                    <Plus /> Add step
                  </Button>
                </div>
              )}
            </div>
          </Field>

          <Field
            label="Video"
            error={errors.videoKey}
            hint="MP4 or WebM, up to 60 MB. A short clip (about 15 seconds) loads fastest."
          >
            <VideoField value={v.videoKey ? { key: v.videoKey } : null} onChange={(video) => set("videoKey", video?.key ?? null)} />
          </Field>
          <Field label="Cover image" error={errors.imageId} hint="Shown before the video plays.">
            <ImageField
              value={cover}
              onChange={(img) => {
                setCover(img);
                set("imageId", img?.id ?? null);
              }}
            />
          </Field>
          <div>
            <Button type="submit" disabled={pending}>
              <SavingIcon pending={pending} /> Save process section
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}

// ---------- Our Story teaser ----------

function StoryCard({ initial }: { initial: AdminSection }) {
  const [v, setV] = useState<StorySectionInput>({
    eyebrow: initial.eyebrow,
    heading: initial.heading,
    headingEmphasis: initial.headingEmphasis,
    body: initial.body,
    ctaLabel: initial.ctaLabel,
    ctaUrl: initial.ctaUrl,
    imageId: initial.image?.id ?? null,
    active: initial.active,
  });
  const [photo, setPhoto] = useState(initial.image);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, run] = useActionRunner();
  const set = <K extends keyof StorySectionInput>(k: K, value: StorySectionInput[K]) =>
    setV((s) => ({ ...s, [k]: value }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = storySectionSchema.safeParse(v);
    if (!parsed.success) return setErrors(fieldErrorsOf(parsed.error));
    setErrors({});
    run(() => saveStorySection(parsed.data), {
      success: "Story section saved",
      onError: (r) => setErrors(firstErrors(r.fieldErrors)),
    });
  }

  return (
    <form onSubmit={submit} noValidate>
      <Card>
        <CardHeader>
          <CardTitle>Our Story</CardTitle>
          <CardDescription>
            The teaser on the home page that links to the Our Story page. The photo is shown in an arch, 4:5, so a
            portrait photo works best.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <ActiveSwitch id="story-active" checked={v.active} onChange={(a) => set("active", a)} />
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Small label" htmlFor="story-eyebrow" error={errors.eyebrow}>
              <Input id="story-eyebrow" value={v.eyebrow} onChange={(e) => set("eyebrow", e.target.value)} />
            </Field>
            <Field label="Heading" htmlFor="story-heading" error={errors.heading}>
              <Input id="story-heading" value={v.heading} onChange={(e) => set("heading", e.target.value)} />
            </Field>
            <Field
              label="Second line, in italics"
              htmlFor="story-emphasis"
              error={errors.headingEmphasis}
              hint="Starts on a new line."
            >
              <Input
                id="story-emphasis"
                value={v.headingEmphasis}
                onChange={(e) => set("headingEmphasis", e.target.value)}
              />
            </Field>
          </div>
          <Field label="Text" htmlFor="story-body" error={errors.body}>
            <Textarea id="story-body" rows={3} value={v.body} onChange={(e) => set("body", e.target.value)} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Link text" htmlFor="story-cta" error={errors.ctaLabel} hint="Leave empty to hide the link.">
              <Input id="story-cta" value={v.ctaLabel} onChange={(e) => set("ctaLabel", e.target.value)} />
            </Field>
            <Field label="Link to" htmlFor="story-url" error={errors.ctaUrl} hint="/our-story, or a full https:// link.">
              <Input id="story-url" value={v.ctaUrl} onChange={(e) => set("ctaUrl", e.target.value)} />
            </Field>
          </div>
          <Field label="Photo" error={errors.imageId}>
            <ImageField
              value={photo}
              onChange={(img) => {
                setPhoto(img);
                set("imageId", img?.id ?? null);
              }}
            />
          </Field>
          <div>
            <Button type="submit" disabled={pending}>
              <SavingIcon pending={pending} /> Save story section
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
