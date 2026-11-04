import { useMemo, useState } from "react";
import { NavLink, useNavigate } from "react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTRPC } from "../../trpc";
import Button from "../../components/button.component";
import { HeaderBreadcrumbs } from "../../layouts/header.component";
import FlowStep from "../../components/flow-step.component";
import CollapsibleSection from "../../components/collapsible-section.component";
import { CardsSelect } from "../../components/cards-select.component";
import { useCollectionMetadataContext } from "./collection-metadata.context";
import { CollectionItem } from "./collection-item.component";
import { PreviewScriptStep } from "./preview-script-step.component";
import { NamePlayStep } from "./name-play-step.component";
import { ImportScriptPreviewToolbar } from "./import-script-preview-toolbar";
import styles from "./from-collection.module.css";

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

function CollectionDetails({ script }: { script: CollectionScript }) {
  const characterNames = Object.values(script.characters);
  return (
    <div className={styles.details}>
      <div className={styles.detailsTitle}>{script.title}</div>
      <div className={styles.detailsMeta}>
        {script.author} · {script.lang.toUpperCase()}
        {script.genre ? ` · ${script.genre}` : ""}
        {script.period ? ` · ${script.period}` : ""}
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
    </div>
  );
}

interface PickStepProps {
  selectedUri: string | null;
  onSelect: (uri: string) => void;
  onNext: () => void;
}

function PickStep(props: PickStepProps) {
  const { genres, periods } = useCollectionMetadataContext();
  const trpc = useTRPC();
  const navigate = useNavigate();
  const { data, isLoading, isError } = useQuery(trpc.playsCollection.listAll.queryOptions());

  const groups = useMemo(() => groupByAuthor(data?.scripts ?? []), [data]);
  const selected = data?.scripts.find((s) => s.uri === props.selectedUri) ?? null;

  const handlePrevious = () => {
    navigate("/plays/new");
  };

  const roleOptions = [
    ...Array.from({ length: 10 }, (_, i) => ({ label: `${i + 1}`, value: `${i + 1}` })),
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
        <div className={styles.filters}>
          <div>
            <strong>Filter by</strong>
          </div>
          <CollapsibleSection Header="▶ Title" collapsed={false}>
            <input type="text" />
          </CollapsibleSection>
          <CollapsibleSection Header="▶ Author" collapsed={false}>
            <input type="text" />
          </CollapsibleSection>
          <CollapsibleSection Header="▶ Language" collapsed={false}>
            <CardsSelect
              multiple={true}
              options={[
                { label: "FR", value: "fr" },
                { label: "EN", value: "en" },
              ]}
            />
          </CollapsibleSection>
          <CollapsibleSection Header="▶ Number of roles" collapsed={false}>
            <CardsSelect multiple={true} options={roleOptions} />
          </CollapsibleSection>
          <CollapsibleSection Header="▶ Number of male roles" collapsed={false}>
            <CardsSelect multiple={true} options={roleOptions} />
          </CollapsibleSection>
          <CollapsibleSection Header="▶ Number of female roles" collapsed={false}>
            <CardsSelect multiple={true} options={roleOptions} />
          </CollapsibleSection>
          <CollapsibleSection Header="▶ Genre" collapsed={false}>
            <CardsSelect
              multiple={true}
              options={genres.map((genre) => ({ label: genre, value: genre }))}
            />
          </CollapsibleSection>
          <CollapsibleSection Header="▶ Period" collapsed={false}>
            <CardsSelect
              multiple={true}
              options={periods.map((period) => ({ label: period, value: period }))}
            />
          </CollapsibleSection>
        </div>
        <div className={styles.separator} />
        <div className={styles.results}>
          {isLoading ? <div>Loading collection…</div> : null}
          {isError ? <div>Failed to load the collection.</div> : null}
          {!isLoading && !isError && groups.length === 0 ? <div>The collection is empty.</div> : null}
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
        </div>
        {selected ? (
          <>
            <div className={styles.separator} />
            <CollectionDetails script={selected} />
          </>
        ) : null}
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
