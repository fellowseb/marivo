import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useTRPC } from '../../trpc';
import { logger } from '../../lib/logger';
import Button from '../../components/button.component';
import { HeaderBreadcrumbs } from '../../layouts/header.component';
import FlowStep from '../../components/flow-step.component';
import { CardsSelect } from '../../components/cards-select.component';
import { ToggleButton } from '../../components/toggle-button.component';
import { useCollectionMetadataContext } from './collection-metadata.context';
import { CollectionItem } from './collection-item.component';
import { PreviewScriptStep } from './preview-script-step.component';
import { NamePlayStep } from './name-play-step.component';
import { ImportScriptPreviewToolbar } from './import-script-preview-toolbar';
import styles from './from-collection.module.css';
import classNames from 'classnames';

export function FromCollectionBreadcrumbs() {
  return (
    <HeaderBreadcrumbs
      key="new-from-collection"
      crumbs={[
        <NavLink
          to={{
            pathname: '/plays/new',
          }}
        >
          New play
        </NavLink>,
        <NavLink
          to={{
            pathname: '/plays/new/from-collection',
          }}
        >
          From collection
        </NavLink>,
      ]}
    />
  );
}

const PAGE_SIZE = 20;
const FILTERS_STORAGE_KEY = 'marivo:collection-filters';

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
  /** which filter sections are expanded (ticked checkbox); persisted too */
  openSections: Record<string, boolean>;
}

const EMPTY_FILTERS: FiltersState = {
  title: '',
  author: '',
  languages: [],
  roles: [],
  maleRoles: [],
  femaleRoles: [],
  genres: [],
  periods: [],
  bookmarkedOnly: false,
  openSections: {},
};

function loadFilters(): FiltersState {
  try {
    const raw = localStorage.getItem(FILTERS_STORAGE_KEY);
    if (!raw) return EMPTY_FILTERS;
    return { ...EMPTY_FILTERS, ...(JSON.parse(raw) as Partial<FiltersState>) };
  } catch (error) {
    logger.warn('failed to load collection filters from localStorage', {
      error,
    });
    return EMPTY_FILTERS;
  }
}

/** "1".."9" selectable values plus "10+"; maps to a min/max range. */
function rolesToRange(values: string[]): { min?: number; max?: number } {
  if (!values.length) return {};
  const nums = values.map((v) => (v === '10+' ? 10 : Number.parseInt(v, 10)));
  return {
    min: Math.min(...nums),
    max: values.includes('10+') ? undefined : Math.max(...nums),
  };
}

/**
 * Build the server-side filter input. A filter whose section is collapsed
 * (checkbox empty) is disabled: its value is kept locally but not sent.
 */
function toApiFilters(f: FiltersState) {
  const open = (key: string) => f.openSections[key] ?? false;
  const roles = open('roles') ? rolesToRange(f.roles) : {};
  const male = open('maleRoles') ? rolesToRange(f.maleRoles) : {};
  const female = open('femaleRoles') ? rolesToRange(f.femaleRoles) : {};
  return {
    title: open('title') && f.title ? f.title : undefined,
    author: open('author') && f.author ? f.author : undefined,
    languages:
      open('languages') && f.languages.length ? f.languages : undefined,
    genres: open('genres') && f.genres.length ? f.genres : undefined,
    periods: open('periods') && f.periods.length ? f.periods : undefined,
    minRoles: roles.min,
    maxRoles: roles.max,
    minMaleRoles: male.min,
    maxMaleRoles: male.max,
    minFemaleRoles: female.min,
    maxFemaleRoles: female.max,
    bookmarkedOnly: open('bookmarked') && f.bookmarkedOnly ? true : undefined,
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
function groupByAuthor(
  scripts: CollectionScript[],
): [string, CollectionScript[]][] {
  const groups = new Map<string, CollectionScript[]>();
  for (const script of scripts) {
    const list = groups.get(script.author) ?? [];
    list.push(script);
    groups.set(script.author, list);
  }
  return [...groups.entries()];
}

/**
 * A filter section: a checkbox header (ticked = expanded = filter enabled,
 * empty = collapsed = filter disabled). The open state lives in the
 * persisted filters state.
 */
function FilterSection(props: {
  label: string;
  sectionKey: string;
  openSections: Record<string, boolean>;
  onToggleSection: (key: string, open: boolean) => void;
  children: ReactNode;
}) {
  const open = props.openSections[props.sectionKey] ?? false;
  return (
    <div className={styles.filterSection}>
      <label className={styles.filterSectionHeader}>
        <input
          type="checkbox"
          checked={open}
          onChange={(e) =>
            props.onToggleSection(props.sectionKey, e.target.checked)
          }
        />
        <span>{props.label}</span>
      </label>
      <fieldset
        className={classNames(styles.filterSectionBody, {
          [styles.filterSectionCollapsed]: !open,
        })}
        disabled={!open}
      >
        {props.children}
      </fieldset>
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
}) {
  const { script } = props;
  const characterNames = Object.values(script.characters);
  return (
    <div className={styles.details}>
      <div className={styles.detailsTitle}>{script.title}</div>
      <div className={styles.detailsAuthor}>{script.author}</div>
      <DetailSection label="Synopsis">
        {script.synopsis ? (
          <p className={styles.synopsis}>{script.synopsis}</p>
        ) : null}
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
        {script.numberOfMaleRoles != null
          ? ` · ${script.numberOfMaleRoles} male`
          : ''}
        {script.numberOfFemaleRoles != null
          ? ` · ${script.numberOfFemaleRoles} female`
          : ''}
      </DetailSection>
      <DetailSection label="Genre">{script.genre}</DetailSection>
      <DetailSection label="Period">{script.period}</DetailSection>
      <DetailSection label="Language">
        {script.lang.toUpperCase()}
      </DetailSection>
      <DetailSection label="Other">{script.numberOfWords} words</DetailSection>
      <div className={styles.detailsActions}>
        <Button
          icon="memorize"
          ariaLabel={script.bookmarked ? 'Remove bookmark' : 'Bookmark'}
          disabled={props.bookmarkPending}
          onClick={props.onToggleBookmark}
          customClassNames={[styles.bookmarkButton]}
        />
        <Button icon="close" ariaLabel="Close" onClick={props.onClose} />
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

  const [filters, setFilters] = useState<FiltersState>(loadFilters);
  const [page, setPage] = useState(1);
  const [filtersHidden, setFiltersHidden] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Persist filter state so it is restored on the next visit
  useEffect(() => {
    try {
      localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters));
    } catch (error) {
      logger.warn('failed to save collection filters to localStorage', {
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
  const selected =
    data?.scripts.find((s) => s.uri === props.selectedUri) ?? null;
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));

  const setFilter = <K extends keyof FiltersState>(
    key: K,
    value: FiltersState[K],
  ) => {
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
    // bring the details panel (anchored at the top of the results) into view
    // (scrollTo is optional: jsdom does not implement it)
    resultsRef.current?.scrollTo?.({ top: 0 });
  };

  // ESC closes the details pane (and unselects the script)
  useEffect(() => {
    if (!props.selectedUri) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleSelect(null);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [props.selectedUri]);

  const handlePrevious = () => {
    navigate('/plays/new');
  };

  const roleOptions = [
    ...Array.from({ length: 9 }, (_, i) => ({
      label: `${i + 1}`,
      value: `${i + 1}`,
    })),
    { label: '10+', value: '10+' },
  ];

  // number of enabled filter sections (ticked checkboxes)
  const enabledCount = Object.values(filters.openSections).filter(
    Boolean,
  ).length;

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
              customClassNames={[styles.filtersToggle]}
              onClick={() => setFiltersHidden((prev) => !prev)}
            >
              {filtersHidden
                ? enabledCount > 0
                  ? `(${enabledCount})`
                  : ''
                : `Filter by${enabledCount > 0 ? ` (${enabledCount})` : ''}`}
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
              >
                <input
                  type="text"
                  value={filters.title}
                  onChange={(e) => setFilter('title', e.target.value)}
                />
              </FilterSection>
              <FilterSection
                label="Author"
                sectionKey="author"
                openSections={filters.openSections}
                onToggleSection={toggleSection}
              >
                <input
                  type="text"
                  value={filters.author}
                  onChange={(e) => setFilter('author', e.target.value)}
                />
              </FilterSection>
              <FilterSection
                label="Language"
                sectionKey="languages"
                openSections={filters.openSections}
                onToggleSection={toggleSection}
              >
                <CardsSelect
                  multiple={true}
                  value={filters.languages}
                  onChange={(values) => setFilter('languages', values)}
                  options={[
                    { label: 'FR', value: 'fr' },
                    { label: 'EN', value: 'en' },
                  ]}
                />
              </FilterSection>
              <FilterSection
                label="Number of roles"
                sectionKey="roles"
                openSections={filters.openSections}
                onToggleSection={toggleSection}
              >
                <CardsSelect
                  multiple={true}
                  value={filters.roles}
                  onChange={(values) => setFilter('roles', values)}
                  options={roleOptions}
                />
              </FilterSection>
              <FilterSection
                label="Number of male roles"
                sectionKey="maleRoles"
                openSections={filters.openSections}
                onToggleSection={toggleSection}
              >
                <CardsSelect
                  multiple={true}
                  value={filters.maleRoles}
                  onChange={(values) => setFilter('maleRoles', values)}
                  options={roleOptions}
                />
              </FilterSection>
              <FilterSection
                label="Number of female roles"
                sectionKey="femaleRoles"
                openSections={filters.openSections}
                onToggleSection={toggleSection}
              >
                <CardsSelect
                  multiple={true}
                  value={filters.femaleRoles}
                  onChange={(values) => setFilter('femaleRoles', values)}
                  options={roleOptions}
                />
              </FilterSection>
              <FilterSection
                label="Genre"
                sectionKey="genres"
                openSections={filters.openSections}
                onToggleSection={toggleSection}
              >
                <CardsSelect
                  multiple={true}
                  value={filters.genres}
                  onChange={(values) => setFilter('genres', values)}
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
              >
                <CardsSelect
                  multiple={true}
                  value={filters.periods}
                  onChange={(values) => setFilter('periods', values)}
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
              >
                <ToggleButton
                  label="Only bookmarked"
                  value={filters.bookmarkedOnly}
                  onToggle={(value) => setFilter('bookmarkedOnly', value)}
                />
              </FilterSection>
            </div>
          </div>
          <div className={styles.filtersFooter}>
            {enabledCount > 0 ? (
              <Button
                icon="clear"
                ariaLabel="Clear filters"
                onClick={clearFilters}
              >
                {filtersHidden ? null : 'Clear'}
              </Button>
            ) : null}
          </div>
        </div>
        <div className={styles.separator} />
        <div className={styles.resultsColumn}>
          <div className={styles.results} ref={resultsRef}>
            {isLoading ? <div>Loading collection…</div> : null}
            {isError ? <div>Failed to load the collection.</div> : null}
            {!isLoading && !isError && groups.length === 0 ? (
              <div>No script matches the filters.</div>
            ) : null}
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
                      numberOfMaleRoles={script.numberOfMaleRoles}
                      numberOfFemaleRoles={script.numberOfFemaleRoles}
                      selected={script.uri === props.selectedUri}
                      onSelect={() => handleSelect(script.uri)}
                    />
                  ))}
                </div>
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
            />
          ) : null}
        </div>
      </div>
    </FlowStep>
  );
}

type Step = 'pick' | 'preview' | 'name';

function FromCollectionFlow() {
  const [step, setStep] = useState<Step>('pick');
  const [selectedUri, setSelectedUri] = useState<string | null>(null);
  const trpc = useTRPC();
  const { mutateAsync: createFromCollection } = useMutation(
    trpc.plays.createFromCollection.mutationOptions(),
  );

  if (step === 'preview' && selectedUri) {
    return (
      <PreviewScriptStep
        scriptUri={selectedUri}
        from="collection"
        sourceLabel="Pick from our scripts collection"
        toolbar={<ImportScriptPreviewToolbar />}
        onBack={() => setStep('pick')}
        onReviewDone={() => setStep('name')}
      />
    );
  }
  if (step === 'name' && selectedUri) {
    return (
      <NamePlayStep
        sourceLabel="Pick from our scripts collection"
        onBack={() => setStep('preview')}
        createPlay={(title) =>
          createFromCollection({ title, collectionUri: selectedUri })
        }
      />
    );
  }
  return (
    <PickStep
      selectedUri={selectedUri}
      onSelect={setSelectedUri}
      onNext={() => setStep('preview')}
    />
  );
}

function FromCollection() {
  return <FromCollectionFlow />;
}

export default FromCollection;
