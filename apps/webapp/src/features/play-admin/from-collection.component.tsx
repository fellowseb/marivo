import { useEffect, useMemo, useState } from "react";
import { NavLink, useNavigate } from "react-router";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "../../trpc";
import { logger } from "../../lib/logger";
import Button from "../../components/button.component";
import { HeaderBreadcrumbs } from "../../layouts/header.component";
import FlowStep from "../../components/flow-step.component";
import CollapsibleSection from "../../components/collapsible-section.component";
import { CardsSelect } from "../../components/cards-select.component";
import { ToggleButton } from "../../components/toggle-button.component";
import { useCollectionMetadataContext } from "./collection-metadata.context";
import { CollectionItem } from "./collection-item.component";
import { PreviewScriptStep } from "./preview-script-step.component";
import { NamePlayStep } from "./name-play-step.component";
import { ImportScriptPreviewToolbar } from "./import-script-preview-toolbar";
import styles from "./from-collection.module.css";
import classNames from "classnames";

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

interface FiltersState {
  title: string;
  author: string;
  languages: string[];
  roles: string[];
  maleRoles: string[];
  femaleRoles: string[];
  genres: string[];
  periods: string[];
  bookmarkedOnly: boolean;
}

const EMPTY_FILTERS: FiltersState = {
  title: "",
  author: "",
  languages: [],
  roles: [],
  maleRoles: [],
  femaleRoles: [],
  genres: [],
  periods: [],
  bookmarkedOnly: false,
};

function loadFilters(): FiltersState {
  try {
    const raw = localStorage.getItem(FILTERS_STORAGE_KEY);
    if (!raw) return EMPTY_FILTERS;
    return { ...EMPTY_FILTERS, ...(JSON.parse(raw) as Partial<FiltersState>) };
  } catch (error) {
    logger.warn("failed to load collection filters from localStorage", { error });
    return EMPTY_FILTERS;
  }
}

/** "1".."9" selectable values plus "10+"; maps to a min/max range. */
function rolesToRange(values: string[]): { min?: number; max?: number } {
  if (!values.length) return {};
  const nums = values.map((v) => (v === "10+" ? 10 : Number.parseInt(v, 10)));
  return {
    min: Math.min(...nums),
    max: values.includes("10+") ? undefined : Math.max(...nums),
  };
}

function toApiFilters(f: FiltersState) {
  const roles = rolesToRange(f.roles);
  const male = rolesToRange(f.maleRoles);
  const female = rolesToRange(f.femaleRoles);
  return {
    title: f.title || undefined,
    author: f.author || undefined,
    languages: f.languages.length ? f.languages : undefined,
    genres: f.genres.length ? f.genres : undefined,
    periods: f.periods.length ? f.periods : undefined,
    minRoles: roles.min,
    maxRoles: roles.max,
    minMaleRoles: male.min,
    minFemaleRoles: female.min,
    bookmarkedOnly: f.bookmarkedOnly || undefined,
  };
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

function CollectionDetails(props: {
  script: CollectionScript;
  onClose: () => void;
  onToggleBookmark: () => void;
  bookmarkPending: boolean;
}) {
  const { script } = props;
  const characterNames = Object.values(script.characters);
  return (
    <div className={styles.details}>
      <div className={styles.detailsHeader}>
        <div className={styles.detailsTitle}>{script.title}</div>
        <Button icon="close" onClick={props.onClose}>
          Close
        </Button>
      </div>
      <div className={styles.detailsMeta}>
        {script.author} · {script.lang.toUpperCase()}
        {script.genre ? ` · ${script.genre}` : ""}
        {script.period ? ` · ${script.period}` : ""}
        {script.numberOfRoles != null ? ` · ${script.numberOfRoles} roles` : ""}
        {` · ${script.numberOfWords} words`}
      </div>
      {script.synopsis ? <p className={styles.synopsis}>{script.synopsis}</p> : null}
      {characterNames.length > 0 ? (
        <>
          <div className={styles.detailsSubtitle}>Characters</div>
          <ul className={styles.characters}>
            {characterNames.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        </>
      ) : null}
      <Button
        icon="memorize"
        disabled={props.bookmarkPending}
        onClick={props.onToggleBookmark}
      >
        {script.bookmarked ? "Bookmarked" : "Bookmark"}
      </Button>
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

  const [filters, setFilters] = useState<FiltersState>(loadFilters);
  const [page, setPage] = useState(1);
  const [filtersHidden, setFiltersHidden] = useState(false);

  // Persist filter state so it is restored on the next visit
  useEffect(() => {
    try {
      localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters));
    } catch (error) {
      logger.warn("failed to save collection filters to localStorage", { error });
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
        queryClient.invalidateQueries({ queryKey: trpc.playsCollection.listAll.queryKey() });
      },
    }),
  );

  const groups = useMemo(() => groupByAuthor(data?.scripts ?? []), [data]);
  const selected = data?.scripts.find((s) => s.uri === props.selectedUri) ?? null;
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));

  const setFilter = <K extends keyof FiltersState>(key: K, value: FiltersState[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };
  const clearFilters = () => {
    setFilters(EMPTY_FILTERS);
    setPage(1);
  };

  const handlePrevious = () => {
    navigate("/plays/new");
  };

  const roleOptions = [
    ...Array.from({ length: 9 }, (_, i) => ({ label: `${i + 1}`, value: `${i + 1}` })),
    { label: "10+", value: "10+" },
  ];

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
        <div className={classNames(styles.filters, { [styles.filtersHidden]: filtersHidden })}>
          <div className={styles.filtersHeader}>
            <strong>Filter by</strong>
            <Button
              icon="clear"
              variant="discrete"
              onClick={clearFilters}
            >
              Clear
            </Button>
          </div>
          <CollapsibleSection Header="Title" arrow collapsed>
            <input
              type="text"
              value={filters.title}
              onChange={(e) => setFilter("title", e.target.value)}
            />
          </CollapsibleSection>
          <CollapsibleSection Header="Author" arrow collapsed>
            <input
              type="text"
              value={filters.author}
              onChange={(e) => setFilter("author", e.target.value)}
            />
          </CollapsibleSection>
          <CollapsibleSection Header="Language" arrow collapsed>
            <CardsSelect
              multiple={true}
              value={filters.languages}
              onChange={(values) => setFilter("languages", values)}
              options={[
                { label: "FR", value: "fr" },
                { label: "EN", value: "en" },
              ]}
            />
          </CollapsibleSection>
          <CollapsibleSection Header="Number of roles" arrow collapsed>
            <CardsSelect
              multiple={true}
              value={filters.roles}
              onChange={(values) => setFilter("roles", values)}
              options={roleOptions}
            />
          </CollapsibleSection>
          <CollapsibleSection Header="Number of male roles" arrow collapsed>
            <CardsSelect
              multiple={true}
              value={filters.maleRoles}
              onChange={(values) => setFilter("maleRoles", values)}
              options={roleOptions}
            />
          </CollapsibleSection>
          <CollapsibleSection Header="Number of female roles" arrow collapsed>
            <CardsSelect
              multiple={true}
              value={filters.femaleRoles}
              onChange={(values) => setFilter("femaleRoles", values)}
              options={roleOptions}
            />
          </CollapsibleSection>
          <CollapsibleSection Header="Genre" arrow collapsed>
            <CardsSelect
              multiple={true}
              value={filters.genres}
              onChange={(values) => setFilter("genres", values)}
              options={genres.map((genre) => ({ label: genre, value: genre }))}
            />
          </CollapsibleSection>
          <CollapsibleSection Header="Period" arrow collapsed>
            <CardsSelect
              multiple={true}
              value={filters.periods}
              onChange={(values) => setFilter("periods", values)}
              options={periods.map((period) => ({ label: period, value: period }))}
            />
          </CollapsibleSection>
          <CollapsibleSection Header="Bookmarked" arrow collapsed>
            <ToggleButton
              label="Only bookmarked"
              value={filters.bookmarkedOnly}
              onToggle={(value) => setFilter("bookmarkedOnly", value)}
            />
          </CollapsibleSection>
        </div>
        <button
          type="button"
          className={styles.filtersToggle}
          onClick={() => setFiltersHidden((prev) => !prev)}
        >
          {filtersHidden ? "▶ Filters" : "◀ Hide filters"}
        </button>
        <div className={styles.separator} />
        <div className={styles.results}>
          {isLoading ? <div>Loading collection…</div> : null}
          {isError ? <div>Failed to load the collection.</div> : null}
          {!isLoading && !isError && groups.length === 0 ? <div>No script matches the filters.</div> : null}
          {groups.map(([author, scripts]) => (
            <div key={author} className={styles.authorGroup}>
              <div className={styles.authorHeader}>{author}</div>
              <div className={styles.authorItems}>
                {scripts.map((script) => (
                  <CollectionItem
                    key={script.uri}
                    title={script.title}
                    lang={script.lang}
                    genre={script.genre}
                    period={script.period}
                    numberOfRoles={script.numberOfRoles}
                    numberOfWords={script.numberOfWords}
                    selected={script.uri === props.selectedUri}
                    onSelect={() => props.onSelect(script.uri)}
                  />
                ))}
              </div>
            </div>
          ))}
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
          <div
            className={classNames(styles.detailsOverlay, {
              [styles.detailsOverlayOpen]: selected !== null,
            })}
          >
            {selected ? (
              <CollectionDetails
                script={selected}
                bookmarkPending={bookmarkPending}
                onClose={() => props.onSelect(null)}
                onToggleBookmark={() => toggleBookmark({ playUri: selected.uri })}
              />
            ) : null}
          </div>
        </div>
      </div>
    </FlowStep>
  );
}

type Step = "pick" | "preview" | "name";

function FromCollectionFlow() {
  const [step, setStep] = useState<Step>("pick");
  const [selectedUri, setSelectedUri] = useState<string | null>(null);
  const trpc = useTRPC();
  const { mutateAsync: createFromCollection } = useMutation(
    trpc.plays.createFromCollection.mutationOptions(),
  );

  if (step === "preview" && selectedUri) {
    return (
      <PreviewScriptStep
        scriptUri={selectedUri}
        from="collection"
        toolbar={<ImportScriptPreviewToolbar />}
        onBack={() => setStep("pick")}
        onReviewDone={() => setStep("name")}
      />
    );
  }
  if (step === "name" && selectedUri) {
    return (
      <NamePlayStep
        onBack={() => setStep("preview")}
        createPlay={(title) => createFromCollection({ title, collectionUri: selectedUri })}
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
