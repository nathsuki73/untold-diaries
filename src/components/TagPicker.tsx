/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState } from "react";
import CreatableSelect from "react-select/creatable";
import type { GroupBase, OptionProps } from "react-select";
import {
  MAX_TAG_LENGTH,
  normalizeTag,
  tagKey,
} from "@/lib/tagUtils";

type TagOption = {
  value: string;
  label: string;
  count?: number;
};

type TagGroup = GroupBase<TagOption>;

type TagPickerProps = {
  value: string | null;
  onChange: (tag: string | null) => void;
};

function mapTags(data: any): TagOption[] {
  if (!Array.isArray(data?.tags)) return [];
  return data.tags.flatMap((item: any) => {
    const label = normalizeTag(item?.tag);
    if (!label) return [];
    return [
      {
        value: tagKey(label),
        label,
        count: Math.max(0, Number(item?.count) || 0),
      },
    ];
  });
}

function flattenOptions(
  options: readonly (TagOption | TagGroup)[]
): TagOption[] {
  return options.flatMap((option) =>
    "options" in option ? [...option.options] : [option]
  );
}

function TagOptionRow(props: OptionProps<TagOption, false, TagGroup>) {
  const { innerRef, innerProps, isFocused, data } = props;
  return (
    <div
      ref={innerRef}
      {...innerProps}
      className={`flex cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2 text-sm ${
        isFocused ? "bg-surface-raised text-ink" : "text-ink"
      }`}
    >
      <span className="min-w-0 truncate">{data.label}</span>
      {typeof data.count === "number" && data.count > 0 && (
        <span className="shrink-0 text-xs text-muted">
          {data.count} {data.count === 1 ? "story" : "stories"}
        </span>
      )}
    </div>
  );
}

export default function TagPicker({ value, onChange }: TagPickerProps) {
  const [popular, setPopular] = useState<TagOption[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [matches, setMatches] = useState<TagOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/tags?limit=8", {
      signal: controller.signal,
      cache: "no-store",
    })
      .then((res) => (res.ok ? res.json() : { tags: [] }))
      .then((data) => setPopular(mapTags(data)))
      .catch(() => setPopular([]));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const search = normalizeTag(inputValue);
    if (!search) {
      setMatches([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(() => {
      fetch(`/api/tags?q=${encodeURIComponent(search)}&limit=8`, {
        signal: controller.signal,
        cache: "no-store",
      })
        .then((res) => (res.ok ? res.json() : { tags: [] }))
        .then((data) => setMatches(mapTags(data)))
        .catch(() => setMatches([]))
        .finally(() => setLoading(false));
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [inputValue]);

  const groups = useMemo(() => {
    const searching = Boolean(normalizeTag(inputValue));
    const options = searching ? matches : popular;
    if (options.length === 0) return [];
    return [
      {
        label: searching ? "Matching groups" : "Popular groups",
        options,
      },
    ];
  }, [inputValue, matches, popular]);

  const selected = value
    ? { value: tagKey(value), label: value }
    : null;

  return (
    <div className="mt-2">
      <CreatableSelect<TagOption, false, TagGroup>
        inputId="group-tag"
        instanceId="group-tag"
        name="group-tag"
        aria-describedby="group-tag-hint"
        options={groups}
        value={selected}
        inputValue={inputValue}
        isClearable
        isSearchable
        isLoading={loading}
        filterOption={null}
        placeholder="Search or create a group…"
        noOptionsMessage={() =>
          normalizeTag(inputValue)
            ? "No groups found. Type to create one."
            : "No popular groups yet"
        }
        loadingMessage={() => "Searching groups…"}
        formatCreateLabel={(input) =>
          `Create “${normalizeTag(input) ?? input.trim().slice(0, MAX_TAG_LENGTH)}”`
        }
        isValidNewOption={(input, _selected, options) => {
          const cleaned = normalizeTag(input);
          if (!cleaned) return false;
          const key = tagKey(cleaned);
          return !flattenOptions(options as readonly (TagOption | TagGroup)[]).some(
            (option) => option.value === key
          );
        }}
        getNewOptionData={(_input, optionLabel) => {
          const label = String(optionLabel ?? "");
          return { value: tagKey(label), label };
        }}
        onCreateOption={(input) => {
          const cleaned = normalizeTag(input);
          if (!cleaned) return;
          onChange(cleaned);
          setInputValue("");
        }}
        onChange={(option) => {
          onChange(option ? option.label : null);
          setInputValue("");
        }}
        onInputChange={(nextValue, actionMeta) => {
          if (actionMeta.action === "input-change") setInputValue(nextValue);
        }}
        components={{ Option: TagOptionRow }}
        formatGroupLabel={(group) => (
          <div className="px-3 py-1.5 text-xs font-medium text-muted">
            {group.label}
          </div>
        )}
        className="w-full"
        styles={{
          control: (base, state) => ({
            ...base,
            minHeight: 44,
            backgroundColor: "var(--surface-raised)",
            borderColor: state.isFocused ? "var(--accent)" : "var(--line)",
            borderRadius: 8,
            boxShadow: state.isFocused
              ? "0 0 0 2px color-mix(in srgb, var(--accent) 30%, transparent)"
              : "none",
            fontSize: 14,
            ":hover": {
              borderColor: state.isFocused
                ? "var(--accent)"
                : "var(--line-strong)",
            },
          }),
          valueContainer: (base) => ({ ...base, padding: "2px 12px" }),
          singleValue: (base) => ({ ...base, color: "var(--ink)" }),
          input: (base) => ({ ...base, color: "var(--ink)" }),
          placeholder: (base) => ({ ...base, color: "var(--muted)" }),
          menu: (base) => ({
            ...base,
            backgroundColor: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: 8,
            overflow: "hidden",
            zIndex: 50,
          }),
          menuList: (base) => ({ ...base, padding: 4 }),
          option: (base) => ({
            ...base,
            backgroundColor: "transparent",
            color: "var(--ink)",
            cursor: "pointer",
            padding: 0,
          }),
          noOptionsMessage: (base) => ({
            ...base,
            color: "var(--muted)",
            fontSize: 13,
          }),
          loadingMessage: (base) => ({
            ...base,
            color: "var(--muted)",
            fontSize: 13,
          }),
          indicatorSeparator: () => ({ display: "none" }),
          dropdownIndicator: (base) => ({
            ...base,
            color: "var(--muted)",
            ":hover": { color: "var(--ink)" },
          }),
          clearIndicator: (base) => ({
            ...base,
            color: "var(--muted)",
            ":hover": { color: "var(--ink)" },
          }),
        }}
      />

      {popular.length > 0 && (
        <div className="mt-3">
          <p id="popular-group-chips" className="text-xs font-medium text-muted">
            Popular groups
          </p>
          <div
            role="group"
            aria-labelledby="popular-group-chips"
            className="mt-2 flex gap-2 overflow-x-auto pb-1"
          >
            {popular.map((option) => {
              const active = value === option.label;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onChange(option.label)}
                  className={`inline-flex min-h-11 shrink-0 items-center rounded-lg border px-3 text-sm transition-colors ${
                    active
                      ? "border-accent bg-accent-weak text-ink"
                      : "border-line bg-surface text-muted hover:bg-surface-raised hover:text-ink"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
