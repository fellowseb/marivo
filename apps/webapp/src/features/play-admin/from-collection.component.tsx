import { useEffect, useMemo, useState, type ReactNode } from "react";
import { NavLink, useNavigate } from "react-router";
import { useUser } from "@clerk/react";
import { hasCapability, parseRole } from "@marivo/utils";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "../../trpc";
import { logger } from "../../lib/logger";
import Button from "../../components/button.component";
import { HeaderBreadcrumbs } from "../../layouts/header.component";
import FlowStep from "../../components/flow-step.component";
import { CardsSelect } from "../../components/cards-select.component";
import { ToggleButton } from "../../components/toggle-button.component";
import { useCollectionMetadataContext } from "./collection-metadata.context";
import { CollectionItem } from "./collection-item.component";
import { PreviewScriptStep } from "./preview-script-step.component";
import { NamePlayStep } from "./name-play-step.component";
import { ImportScriptPreviewToolbar } from "./import-script-preview-toolbar";
import styles from "./from-collection.module.css";
import itemListStyles from "../../components/item-list/item-list.module.css";
import classNames from "classnames";
import {
  EMPTY_FILTERS,
  countSetControls,
  sectionHasValue,
  toApiFilters,
  type FiltersState,
} from "./from-collection-filters.lib";

export function FromCollectionBreadcrumbs() {
  return (
    <HeaderBreadcrumbs
      key="new-from-collection"
      crumbs={[
        <NavLink
          to={{
            pathname: "/plays/new",
          }}
        >
          New play
        </NavLink>,
        <NavLink
          to={{
            pathname: "/plays/new/from-collection",
          }}
        >
          From collection
        </NavLink>,
      ]}
    />
  );
}

const PAGE_SIZE = 20;
const FILTERS_STORAGE_KEY = "marivo:collection-filters";

function loadFilters(): FiltersState {
  try {
    const raw = localStorage.getItem(FILTERS_STORAGE_KEY);
    if (!raw) return EMPTY_FILTERS;
    return { ...EMPTY_FILTERS, ...(JSON.parse(raw) as Partial<FiltersState>) };
  } catch (error) {
    logger.warn("failed to load collection filters from localStorage", {
      error,
    });
    return EMPTY_FILTERS;
  }
}

type CollectionScript = {
  uri: string;
  title: string;
  author: string;
  lang: string;
  genre: string | null;
  period: string | null;
  synopsis: string | null;
  numberOfRoles: number | null;
  numberOfMaleRoles: number | null;
  numberOfFemaleRoles: number | null;
  numberOfWords: number;
  characters: Record<string, string>;
  bookmarked: boolean;
  archived: boolean;
};

/** Group scripts under their author, keeping the API's author/title ordering. */
function groupByAuthor(scripts: CollectionScript[]): [string, CollectionScript[]][] {
  const groups = new Map<string, CollectionScript[]>();
  for (const script of scripts) {
    const list = groups.get(script.author) ?? [];
    list.push(script);
    groups.set(script.author, list);
  }
  return [...groups.entries()];
}

/**
 * A filter section: an arrow-collapsible header. A section with a filter
 * value set cannot be collapsed (the arrow is hidden and the header is not
 * clickable) — its value is always active. The open state lives in the
 * persisted filters state.
 */
function FilterSection(props: {
  label: string;
  sectionKey: string;
  openSections: Record<string, boolean>;
  filters: FiltersState;
  onToggleSection: (key: string, open: boolean) => void;
  children: ReactNode;
}) {
  const hasValue = sectionHasValue(props.sectionKey, props.filters);
  const open = hasValue || (props.openSections[props.sectionKey] ?? false);
  return (
    <div className={styles.filterSection}>
      <button
        type="button"
        className={styles.filterSectionHeader}
        aria-label={props.label}
        aria-expanded={open}
        disabled={hasValue}
        onClick={() => props.onToggleSection(props.sectionKey, !open)}
      >
        <span
          className={classNames(styles.filterSectionArrow, {
            [styles.filterSectionArrowOpen]: open,
          })}
        >
          ▶
        </span>
        <span>{props.label}</span>
      </button>
      <div
        className={classNames(styles.filterSectionBody, {
          [styles.filterSectionCollapsed]: !open,
        })}
      >
        {props.children}
      </div>
    </div>
  );
}

function DetailSection(props: { label: string; children: ReactNode }) {
  return (
    <div className={styles.detailSection}>
      <div className={styles.detailLabel}>{props.label}</div>
      {props.children}
    </div>
  );
}

function CollectionDetails(props: {
  script: CollectionScript;
  onClose: () => void;
  onToggleBookmark: () => void;
  bookmarkPending: boolean;
  onEdit?: (() => void) | undefined;
}) {
  const { script } = props;
  const characterNames = Object.values(script.characters);
  return (
    <div className={styles.details}>
      <div className={styles.detailsBody}>
        <DetailSection label="">
          <div className={styles.detailsTitle}>{script.title}</div>
          <div className={styles.detailsAuthor}>{script.author}</div>
        </DetailSection>
        <DetailSection label="Synopsis">
          {script.synopsis ? <p className={styles.synopsis}>{script.synopsis}</p> : null}
        </DetailSection>
        <DetailSection label="Characters">
          {characterNames.length > 0 ? (
            <ul className={styles.characters}>
              {characterNames.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          ) : null}
        </DetailSection>
        <DetailSection label="Distribution">
          {script.numberOfRoles != null ? `${script.numberOfRoles} roles` : null}
          {script.numberOfMaleRoles != null ? ` · ${script.numberOfMaleRoles} male` : ""}
          {script.numberOfFemaleRoles != null ? ` · ${script.numberOfFemaleRoles} female` : ""}
        </DetailSection>
        <DetailSection label="Genre">{script.genre}</DetailSection>
        <DetailSection label="Period">{script.period}</DetailSection>
        <DetailSection label="Language">{script.lang.toUpperCase()}</DetailSection>
        <DetailSection label="Other">{script.numberOfWords} words</DetailSection>
      </div>
      <div className={styles.detailsActions}>
        <Button
          icon="memorize"
          ariaLabel={script.bookmarked ? "Remove bookmark" : "Bookmark"}
          disabled={props.bookmarkPending}
          onClick={props.onToggleBookmark}
          customClassNames={[styles.bookmarkButton]}
        />
        {props.onEdit ? (
          <Button icon="script" ariaLabel="Edit in collection" onClick={props.onEdit}>
            Edit
          </Button>
        ) : null}
        <Button icon="close" ariaLabel="Close" onClick={props.onClose}>
          Close
        </Button>
      </div>
    </div>
  );
}

interface PickStepProps {
  selectedUri: string | null;
  onSelect: (uri: string | null) => void;
  onNext: () => void;
}

function PickStep(props: PickStepProps) {
  const { genres, periods } = useCollectionMetadataContext();
  const trpc = useTRPC();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useUser();
  const role = parseRole((user?.publicMetadata as { role?: unknown } | undefined)?.role);
  const canEditCollectionPlay = hasCapability(role, "edit_collection_play_script");
  const canSeeArchived = hasCapability(role, "edit_collection_play_metadata");

  const [filters, setFilters] = useState<FiltersState>(loadFilters);
  const [page, setPage] = useState(1);
  const [filtersHidden, setFiltersHidden] = useState(false);

  // Persist filter state so it is restored on the next visit
  useEffect(() => {
    try {
      localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters));
    } catch (error) {
      logger.warn("failed to save collection filters to localStorage", {
        error,
      });
    }
  }, [filters]);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setPage(1);
  }, [filters]);

  const { data, isLoading, isError } = useQuery({
    ...trpc.playsCollection.listAll.queryOptions({
      filters: toApiFilters(filters),
      page,
      pageSize: PAGE_SIZE,
    }),
    placeholderData: keepPreviousData,
  });

  const { mutate: toggleBookmark, isPending: bookmarkPending } = useMutation(
    trpc.playsCollection.toggleBookmark.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.playsCollection.listAll.queryKey(),
        });
      },
    }),
  );

  const groups = useMemo(() => groupByAuthor(data?.scripts ?? []), [data]);
  const selected = data?.scripts.find((s) => s.uri === props.selectedUri) ?? null;
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));

  const setFilter = <K extends keyof FiltersState>(key: K, value: FiltersState[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };
  const toggleSection = (key: string, open: boolean) => {
    setFilters((prev) => ({
      ...prev,
      openSections: { ...prev.openSections, [key]: open },
    }));
  };
  const clearFilters = () => {
    setFilters(EMPTY_FILTERS);
    setPage(1);
  };
  const handleSelect = (uri: string | null) => {
    props.onSelect(uri);
  };

  // ESC closes the details pane (and unselects the script)
  useEffect(() => {
    if (!props.selectedUri) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleSelect(null);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [props.selectedUri]);

  const handlePrevious = () => {
    navigate("/plays/new");
  };

  const roleOptions = [
    ...Array.from({ length: 9 }, (_, i) => ({
      label: `${i + 1}`,
      value: `${i + 1}`,
    })),
    { label: "10+", value: "10+" },
  ];

  // number of controls currently set (non-empty text, selection, or toggle on)
  const enabledCount = countSetControls(filters);

  return (
    <FlowStep
      title="Pick from our scripts collection"
      Actions={
        <>
          <Button icon="previous" onClick={handlePrevious} />
          <Button disabled={!selected} rightIcon="next" onClick={props.onNext}>
            Next
          </Button>
        </>
      }
    >
      <div className={styles.container}>
        <div className={styles.filtersColumn}>
          <div className={styles.filtersBar}>
            <Button
              icon="filter"
              onClick={() => setFiltersHidden((prev) => !prev)}
              rightIcon={filtersHidden ? "chevronRightDouble" : "chevronLeftDouble"}
            >
              {filtersHidden
                ? enabledCount > 0
                  ? `(${enabledCount})`
                  : ""
                : `Filter by${enabledCount > 0 ? ` (${enabledCount})` : ""}`}
            </Button>
          </div>
          <div
            className={classNames(styles.filters, {
              [styles.filtersHidden]: filtersHidden,
            })}
          >
            <div className={styles.filtersBody}>
              <FilterSection
                label="Title"
                sectionKey="title"
                openSections={filters.openSections}
                onToggleSection={toggleSection}
                filters={filters}
              >
                <div className={styles.textFilter}>
                  <input
                    type="text"
                    value={filters.title}
                    onChange={(e) => setFilter("title", e.target.value)}
                  />
                  {filters.title ? (
                    <Button
                      icon="close"
                      ariaLabel="Clear title filter"
                      onClick={() => setFilter("title", "")}
                    />
                  ) : null}
                </div>
              </FilterSection>
              <FilterSection
                label="Author"
                sectionKey="author"
                openSections={filters.openSections}
                onToggleSection={toggleSection}
                filters={filters}
              >
                <div className={styles.textFilter}>
                  <input
                    type="text"
                    value={filters.author}
                    onChange={(e) => setFilter("author", e.target.value)}
                  />
                  {filters.author ? (
                    <Button
                      icon="close"
                      ariaLabel="Clear author filter"
                      onClick={() => setFilter("author", "")}
                    />
                  ) : null}
                </div>
              </FilterSection>
              <FilterSection
                label="Language"
                sectionKey="languages"
                openSections={filters.openSections}
                onToggleSection={toggleSection}
                filters={filters}
              >
                <CardsSelect
                  multiple={true}
                  value={filters.languages}
                  onChange={(values) => setFilter("languages", values)}
                  options={[
                    { label: "FR", value: "fr" },
                    { label: "EN", value: "en" },
                  ]}
                />
              </FilterSection>
              <FilterSection
                label="Number of roles"
                sectionKey="roles"
                openSections={filters.openSections}
                onToggleSection={toggleSection}
                filters={filters}
              >
                <CardsSelect
                  multiple={true}
                  value={filters.roles}
                  onChange={(values) => setFilter("roles", values)}
                  options={roleOptions}
                />
              </FilterSection>
              <FilterSection
                label="Number of male roles"
                sectionKey="maleRoles"
                openSections={filters.openSections}
                onToggleSection={toggleSection}
                filters={filters}
              >
                <CardsSelect
                  multiple={true}
                  value={filters.maleRoles}
                  onChange={(values) => setFilter("maleRoles", values)}
                  options={roleOptions}
                />
              </FilterSection>
              <FilterSection
                label="Number of female roles"
                sectionKey="femaleRoles"
                openSections={filters.openSections}
                onToggleSection={toggleSection}
                filters={filters}
              >
                <CardsSelect
                  multiple={true}
                  value={filters.femaleRoles}
                  onChange={(values) => setFilter("femaleRoles", values)}
                  options={roleOptions}
                />
              </FilterSection>
              <FilterSection
                label="Genre"
                sectionKey="genres"
                openSections={filters.openSections}
                onToggleSection={toggleSection}
                filters={filters}
              >
                <CardsSelect
                  multiple={true}
                  value={filters.genres}
                  onChange={(values) => setFilter("genres", values)}
                  options={genres.map((genre) => ({
                    label: genre,
                    value: genre,
                  }))}
                />
              </FilterSection>
              <FilterSection
                label="Period"
                sectionKey="periods"
                openSections={filters.openSections}
                onToggleSection={toggleSection}
                filters={filters}
              >
                <CardsSelect
                  multiple={true}
                  value={filters.periods}
                  onChange={(values) => setFilter("periods", values)}
                  options={periods.map((period) => ({
                    label: period,
                    value: period,
                  }))}
                />
              </FilterSection>
              <FilterSection
                label="Bookmarked"
                sectionKey="bookmarked"
                openSections={filters.openSections}
                onToggleSection={toggleSection}
                filters={filters}
              >
                <ToggleButton
                  label="Only bookmarked"
                  value={filters.bookmarkedOnly}
                  onToggle={(value) => setFilter("bookmarkedOnly", value)}
                />
              </FilterSection>
              {canSeeArchived ? (
                <FilterSection
                  label="Archived"
                  sectionKey="archived"
                  openSections={filters.openSections}
                  onToggleSection={toggleSection}
                  filters={filters}
                >
                  <ToggleButton
                    label="Only archived"
                    value={filters.archivedOnly}
                    onToggle={(value) => setFilter("archivedOnly", value)}
                  />
                </FilterSection>
              ) : null}
            </div>
          </div>
          <div className={styles.filtersFooter}>
            {enabledCount > 0 ? (
              <Button icon="clear" ariaLabel="Clear filters" onClick={clearFilters}>
                {filtersHidden ? null : "Clear"}
              </Button>
            ) : null}
          </div>
        </div>
        <div className={styles.separator} />
        <div className={styles.resultsColumn}>
          <div className={classNames(styles.results, itemListStyles.list)}>
            {isLoading ? <div>Loading collection…</div> : null}
            {isError ? <div>Failed to load the collection.</div> : null}
            {!isLoading && !isError && groups.length === 0 ? (
              <div>No script matches the filters.</div>
            ) : null}
            {groups.map(([author, scripts]) => (
              <div key={author} className={styles.authorGroup}>
                <div className={styles.authorHeader}>{author}</div>
                <ul className={styles.authorItems}>
                  {scripts.map((script) => (
                    <CollectionItem
                      key={script.uri}
                      title={script.title}
                      lang={script.lang}
                      genre={script.genre}
                      period={script.period}
                      numberOfRoles={script.numberOfRoles}
                      numberOfMaleRoles={script.numberOfMaleRoles}
                      numberOfFemaleRoles={script.numberOfFemaleRoles}
                      bookmarked={script.bookmarked}
                      archived={script.archived}
                      selected={script.uri === props.selectedUri}
                      onSelect={() => handleSelect(script.uri)}
                    />
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className={styles.pagination}>
            <Button
              icon="previous"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </Button>
            <span>
              Page {page} / {totalPages} · {data?.total ?? 0} scripts
            </span>
            <Button
              icon="next"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next page
            </Button>
          </div>
        </div>
        <div
          className={classNames(styles.detailsOverlay, {
            [styles.detailsOverlayOpen]: selected !== null,
          })}
        >
          {selected ? (
            <CollectionDetails
              script={selected}
              bookmarkPending={bookmarkPending}
              onClose={() => handleSelect(null)}
              onToggleBookmark={() => toggleBookmark({ playUri: selected.uri })}
              onEdit={
                canEditCollectionPlay
                  ? () => navigate(`/collection/edit/${selected.uri}`)
                  : undefined
              }
            />
          ) : null}
        </div>
      </div>
    </FlowStep>
  );
}

type Step = "pick" | "preview" | "name";

function FromCollectionFlow() {
  const [step, setStep] = useState<Step>("pick");
  const [selectedUri, setSelectedUri] = useState<string | null>(null);
  const [lineIdsToKeep, setLineIdsToKeep] = useState<string[] | undefined>(undefined);
  const trpc = useTRPC();
  const { mutateAsync: createFromCollection } = useMutation(
    trpc.plays.createFromCollection.mutationOptions(),
  );

  if (step === "preview" && selectedUri) {
    return (
      <PreviewScriptStep
        scriptUri={selectedUri}
        from="collection"
        sourceLabel="Pick from our scripts collection"
        toolbar={<ImportScriptPreviewToolbar />}
        onBack={() => setStep("pick")}
        onReviewDone={(ids) => {
          setLineIdsToKeep(ids);
          setStep("name");
        }}
      />
    );
  }
  if (step === "name" && selectedUri) {
    return (
      <NamePlayStep
        sourceLabel="Pick from our scripts collection"
        onBack={() => setStep("preview")}
        createPlay={(title) =>
          createFromCollection({ title, collectionUri: selectedUri, lineIdsToKeep })
        }
      />
    );
  }
  return (
    <PickStep
      selectedUri={selectedUri}
      onSelect={setSelectedUri}
      onNext={() => setStep("preview")}
    />
  );
}

function FromCollection() {
  return <FromCollectionFlow />;
}

export default FromCollection;
