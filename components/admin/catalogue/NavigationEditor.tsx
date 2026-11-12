"use client";

import { useState } from "react";
import { ExternalLink, Pencil, Plus, Sparkles } from "lucide-react";
import {
  deleteNavGroup,
  deleteNavLink,
  deleteNavSection,
  reorderNavGroups,
  reorderNavLinks,
  reorderNavSections,
  saveNavGroup,
  saveNavLink,
  saveNavSection,
} from "@/lib/admin/nav";
import type { NavEditorData } from "@/lib/admin/queries/catalogue";
import {
  fieldErrorsOf,
  navGroupSchema,
  navLinkSchema,
  navSectionSchema,
  navTargetTypes,
  type NavGroupInput,
  type NavLinkInput,
  type NavSectionInput,
} from "@/lib/admin/schemas/catalogue";
import { DragHandle, SortableList } from "@/components/admin/SortableList";
import { Badge } from "@/components/admin/ui/badge";
import { Button } from "@/components/admin/ui/button";
import { Card, CardContent, CardHeader } from "@/components/admin/ui/card";
import { Checkbox } from "@/components/admin/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/admin/ui/dialog";
import { Input } from "@/components/admin/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/admin/ui/select";
import { Switch } from "@/components/admin/ui/switch";
import { ConfirmButton, EmptyState, Field, SavingIcon, firstErrors, useActionRunner } from "./shared";

type Targets = NavEditorData["targets"];
type TargetType = (typeof navTargetTypes)[number];
type Section = NavEditorData["sections"][number];
type Link = Section["groups"][number]["links"][number];

type Editing =
  | { kind: "section"; draft: NavSectionInput }
  | { kind: "group"; draft: NavGroupInput }
  | { kind: "link"; draft: NavLinkInput }
  | null;

const TYPE_LABEL: Record<TargetType, string> = {
  category: "Category",
  tag: "Occasion",
  product: "Product",
  combo: "Combo",
  url: "Web address",
};

function describeTarget(link: Link, targets: Targets) {
  if (link.targetType === "url") return link.url ?? "";
  const name = targets[link.targetType].find((t) => t.id === link.targetId)?.name;
  return `${TYPE_LABEL[link.targetType]}: ${name ?? "missing — pick another target"}`;
}

export default function NavigationEditor({ data }: { data: NavEditorData }) {
  const { sections, targets } = data;
  const [editing, setEditing] = useState<Editing>(null);
  const [, run] = useActionRunner();

  const addSection = (
    <Button onClick={() => setEditing({ kind: "section", draft: { heading: "", mode: "manual", active: true } })}>
      <Plus /> Add section
    </Button>
  );

  return (
    <div className="grid max-w-4xl gap-4">
      <div className="flex justify-end">{addSection}</div>
      {sections.length === 0 ? (
        <EmptyState
          title="No menu sections"
          description='Add "By Category" (mirrors the category tree) and "By Occasion" (groups of links you choose).'
          action={addSection}
        />
      ) : (
        <SortableList
          items={sections}
          className="gap-4"
          onReorder={(ids) => run(() => reorderNavSections({ ids }), { success: "Order saved" })}
          renderItem={(s, handle) => (
            <Card className="gap-0 py-0">
              <CardHeader className="flex flex-row items-center gap-3 border-b px-3 py-3">
                <DragHandle {...handle} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{s.heading}</span>
                    <Badge variant="outline">{s.mode === "categories" ? "Category tree" : "Manual"}</Badge>
                    {!s.active && <Badge variant="secondary">Hidden</Badge>}
                  </div>
                </div>
                <Switch
                  checked={s.active}
                  aria-label={s.active ? "Hide section" : "Show section"}
                  onCheckedChange={(active) =>
                    run(() => saveNavSection({ id: s.id, heading: s.heading, mode: s.mode, active }), {
                      success: active ? "Section shown" : "Section hidden",
                    })
                  }
                />
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Edit ${s.heading}`}
                  onClick={() =>
                    setEditing({ kind: "section", draft: { id: s.id, heading: s.heading, mode: s.mode, active: s.active } })
                  }
                >
                  <Pencil />
                </Button>
                <ConfirmButton
                  label={`Delete ${s.heading}`}
                  title={`Delete "${s.heading}"?`}
                  description={s.groups.length ? "Its groups and links are deleted too." : undefined}
                  onConfirm={() => run(() => deleteNavSection({ id: s.id }), { success: "Section deleted" })}
                />
              </CardHeader>
              <CardContent className="p-3">
                {s.mode === "categories" ? (
                  <p className="text-sm text-muted-foreground">
                    Shows the active head categories and their sub-categories automatically, in the order set under
                    Categories.
                  </p>
                ) : (
                  <SectionGroups section={s} targets={targets} onEdit={setEditing} />
                )}
              </CardContent>
            </Card>
          )}
        />
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-lg">
          {editing?.kind === "section" && (
            <SectionForm key={editing.draft.id ?? "new"} initial={editing.draft} onDone={() => setEditing(null)} />
          )}
          {editing?.kind === "group" && (
            <GroupForm key={editing.draft.id ?? "new"} initial={editing.draft} onDone={() => setEditing(null)} />
          )}
          {editing?.kind === "link" && (
            <LinkForm
              key={editing.draft.id ?? "new"}
              initial={editing.draft}
              targets={targets}
              onDone={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SectionGroups({
  section,
  targets,
  onEdit,
}: {
  section: Section;
  targets: Targets;
  onEdit: (e: Editing) => void;
}) {
  const [, run] = useActionRunner();
  return (
    <div className="grid gap-3">
      {section.groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">No groups yet.</p>
      ) : (
        <SortableList
          items={section.groups}
          className="gap-3"
          onReorder={(ids) =>
            run(() => reorderNavGroups({ parentId: section.id, ids }), { success: "Order saved" })
          }
          renderItem={(g, handle) => (
            <div className="rounded-md border">
              <div className="flex items-center gap-2 bg-muted/40 p-2">
                <DragHandle {...handle} />
                <span className="flex-1 font-medium">
                  {g.title}
                  {g.highlight && (
                    <Badge className="ml-2" variant="secondary">
                      <Sparkles /> Highlighted
                    </Badge>
                  )}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    onEdit({
                      kind: "link",
                      draft: { groupId: g.id, label: "", targetType: "category", targetId: null, url: null },
                    })
                  }
                >
                  <Plus /> Link
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Edit ${g.title}`}
                  onClick={() =>
                    onEdit({ kind: "group", draft: { id: g.id, sectionId: section.id, title: g.title, highlight: g.highlight } })
                  }
                >
                  <Pencil />
                </Button>
                <ConfirmButton
                  label={`Delete ${g.title}`}
                  title={`Delete "${g.title}"?`}
                  description={g.links.length ? `Its ${g.links.length} link(s) are deleted too.` : undefined}
                  onConfirm={() => run(() => deleteNavGroup({ id: g.id }), { success: "Group deleted" })}
                />
              </div>
              <div className="p-2">
                {g.links.length === 0 ? (
                  <p className="px-2 py-1 text-sm text-muted-foreground">No links yet.</p>
                ) : (
                  <SortableList
                    items={g.links}
                    className="gap-1"
                    onReorder={(ids) => run(() => reorderNavLinks({ parentId: g.id, ids }), { success: "Order saved" })}
                    renderItem={(l, linkHandle) => {
                      const broken = l.targetType !== "url" && !targets[l.targetType].some((t) => t.id === l.targetId);
                      return (
                        <div className="flex items-center gap-2 rounded-md px-1 py-1 hover:bg-muted/40">
                          <DragHandle {...linkHandle} />
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium">{l.label}</div>
                            <div className={`truncate text-xs ${broken ? "text-destructive" : "text-muted-foreground"}`}>
                              {l.targetType === "url" && <ExternalLink className="mr-1 inline size-3" />}
                              {describeTarget(l, targets)}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Edit ${l.label}`}
                            onClick={() => onEdit({ kind: "link", draft: { ...l, groupId: g.id } })}
                          >
                            <Pencil />
                          </Button>
                          <ConfirmButton
                            label={`Delete ${l.label}`}
                            title={`Delete the link "${l.label}"?`}
                            onConfirm={() => run(() => deleteNavLink({ id: l.id }), { success: "Link deleted" })}
                          />
                        </div>
                      );
                    }}
                  />
                )}
              </div>
            </div>
          )}
        />
      )}
      <div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onEdit({ kind: "group", draft: { sectionId: section.id, title: "", highlight: false } })}
        >
          <Plus /> Add group
        </Button>
      </div>
    </div>
  );
}

function SectionForm({ initial, onDone }: { initial: NavSectionInput; onDone: () => void }) {
  const [d, setD] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, run] = useActionRunner();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = navSectionSchema.safeParse(d);
    if (!parsed.success) return setErrors(fieldErrorsOf(parsed.error));
    run(() => saveNavSection(parsed.data), {
      success: d.id ? "Section saved" : "Section added",
      onSuccess: onDone,
      onError: (r) => setErrors(firstErrors(r.fieldErrors)),
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <DialogHeader>
        <DialogTitle>{d.id ? "Edit section" : "Add section"}</DialogTitle>
        <DialogDescription>A top-level menu, such as &quot;By Category&quot; or &quot;By Occasion&quot;.</DialogDescription>
      </DialogHeader>
      <Field label="Heading" htmlFor="sec-heading" error={errors.heading}>
        <Input id="sec-heading" autoFocus value={d.heading} onChange={(e) => setD({ ...d, heading: e.target.value })} />
      </Field>
      <Field
        label="Contents"
        htmlFor="sec-mode"
        hint={
          d.mode === "categories"
            ? "Mirrors the category tree automatically."
            : "You add groups of links. Switching an existing manual section to the category tree keeps its groups hidden, not deleted."
        }
      >
        <Select value={d.mode} onValueChange={(mode) => setD({ ...d, mode: mode as NavSectionInput["mode"] })}>
          <SelectTrigger id="sec-mode" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="categories">Category tree</SelectItem>
            <SelectItem value="manual">Manual groups and links</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <Switch checked={d.active} onCheckedChange={(active) => setD({ ...d, active })} /> Shown in the menu
      </label>
      <DialogFooter>
        <Button type="submit" disabled={pending}>
          <SavingIcon pending={pending} /> Save
        </Button>
      </DialogFooter>
    </form>
  );
}

function GroupForm({ initial, onDone }: { initial: NavGroupInput; onDone: () => void }) {
  const [d, setD] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, run] = useActionRunner();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = navGroupSchema.safeParse(d);
    if (!parsed.success) return setErrors(fieldErrorsOf(parsed.error));
    run(() => saveNavGroup(parsed.data), {
      success: d.id ? "Group saved" : "Group added",
      onSuccess: onDone,
      onError: (r) => setErrors(firstErrors(r.fieldErrors)),
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <DialogHeader>
        <DialogTitle>{d.id ? "Edit group" : "Add group"}</DialogTitle>
        <DialogDescription>A titled column of links, such as &quot;Diwali Gifting&quot;.</DialogDescription>
      </DialogHeader>
      <Field label="Title" htmlFor="grp-title" error={errors.title}>
        <Input id="grp-title" autoFocus value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={d.highlight} onCheckedChange={(v) => setD({ ...d, highlight: v === true })} />
        Highlight in the accent colour
      </label>
      <DialogFooter>
        <Button type="submit" disabled={pending}>
          <SavingIcon pending={pending} /> Save
        </Button>
      </DialogFooter>
    </form>
  );
}

function LinkForm({ initial, targets, onDone }: { initial: NavLinkInput; targets: Targets; onDone: () => void }) {
  const [d, setD] = useState(initial);
  const [labelTouched, setLabelTouched] = useState(!!initial.id);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, run] = useActionRunner();
  const options = d.targetType === "url" ? [] : targets[d.targetType];

  function pickTarget(id: string) {
    const name = options.find((o) => o.id === id)?.name ?? "";
    // "Home Décor › Planters" → "Planters" for the suggested label.
    const short = name.split(" › ").pop()!.replace(/ \((draft|archived)\)$/, "");
    setD({ ...d, targetId: id, label: labelTouched && d.label ? d.label : short });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const input = d.targetType === "url" ? { ...d, targetId: null } : { ...d, url: null };
    const parsed = navLinkSchema.safeParse(input);
    if (!parsed.success) return setErrors(fieldErrorsOf(parsed.error));
    run(() => saveNavLink(parsed.data), {
      success: d.id ? "Link saved" : "Link added",
      onSuccess: onDone,
      onError: (r) => setErrors(firstErrors(r.fieldErrors)),
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <DialogHeader>
        <DialogTitle>{d.id ? "Edit link" : "Add link"}</DialogTitle>
        <DialogDescription>Point at a category, occasion, product or combo, or type a web address.</DialogDescription>
      </DialogHeader>
      <Field label="Links to" htmlFor="link-type">
        <Select
          value={d.targetType}
          onValueChange={(t) => setD({ ...d, targetType: t as TargetType, targetId: null, url: t === "url" ? (d.url ?? "") : null })}
        >
          <SelectTrigger id="link-type" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {navTargetTypes.map((t) => (
              <SelectItem key={t} value={t}>
                {TYPE_LABEL[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      {d.targetType === "url" ? (
        <Field label="Web address" htmlFor="link-url" error={errors.url} hint="A page on this site (/shop) or a full https:// address.">
          <Input id="link-url" value={d.url ?? ""} placeholder="/shop" onChange={(e) => setD({ ...d, url: e.target.value })} />
        </Field>
      ) : (
        <Field label={TYPE_LABEL[d.targetType]} htmlFor="link-target" error={errors.targetId}>
          {options.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing to pick yet.</p>
          ) : (
            <Select value={d.targetId ?? ""} onValueChange={pickTarget}>
              <SelectTrigger id="link-target" className="w-full">
                <SelectValue placeholder={`Pick a ${d.targetType}`} />
              </SelectTrigger>
              <SelectContent>
                {options.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </Field>
      )}
      <Field label="Label" htmlFor="link-label" error={errors.label}>
        <Input
          id="link-label"
          value={d.label}
          onChange={(e) => {
            setLabelTouched(true);
            setD({ ...d, label: e.target.value });
          }}
        />
      </Field>
      <DialogFooter>
        <Button type="submit" disabled={pending}>
          <SavingIcon pending={pending} /> Save
        </Button>
      </DialogFooter>
    </form>
  );
}
