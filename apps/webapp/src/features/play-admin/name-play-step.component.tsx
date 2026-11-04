import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "../../trpc";
import { logger } from "../../lib/logger";
import Button from "../../components/button.component";
import FlowStep from "../../components/flow-step.component";
import Admonition from "../../components/admonition.component";
import { ToggleButton } from "../../components/toggle-button.component";
import { CardsSelect } from "../../components/cards-select.component";
import { useCollectionMetadataContext } from "./collection-metadata.context";
import styles from "./import-script.module.css";

export interface PlayMetadataDetails {
  title: string;
  author: string;
  language: string;
  number_of_roles: number;
  number_of_male_roles: number;
  number_of_female_roles: number;
  genre?: string | undefined;
  period?: string | undefined;
  suggestions?: Record<string, string>;
}

export interface PublishToCollectionInput {
  title: string;
  author: string;
  lang: "fr" | "en";
  numberOfRoles?: number;
  numberOfMaleRoles?: number;
  numberOfFemaleRoles?: number;
  genre?: string;
  period?: string;
  synopsis?: string;
}

interface NamePlayStepProps {
  onBack: () => void;
  /** First breadcrumb segment of the flow, e.g. "Create from an external source". */
  sourceLabel?: string;
  /** Pre-fill/details for the "add to commons" variant (import flow only). */
  metadata?: PlayMetadataDetails;
  allowAddToCommons?: boolean;
  /** Creates the play and resolves with its uri. */
  createPlay: (title: string) => Promise<{ uri: string }>;
  /**
   * Commons mode only: publishes the imported script to the public collection
   * (no personal play is created) and resolves with the collection entry uri.
   */
  publishToCollection?: (input: PublishToCollectionInput) => Promise<{ uri: string }>;
}

/**
 * Shared "name your new play" step, used by both the import flow and the
 * collection flow. On success it navigates to the new play's edit page.
 *
 * When `allowAddToCommons` is set (import flow, capability-gated by the
 * caller), an "Add to commons library" toggle switches the step to an
 * editable metadata form; creating the play then also publishes its script
 * to the public collection via `playsCollection.addToCollection`.
 */
export function NamePlayStep(props: NamePlayStepProps) {
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [createReady, setCreateReady] = useState(false);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState<{ kind: "play" | "collection"; uri: string } | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [publishError, setPublishError] = useState(false);
  const [lastPublishInput, setLastPublishInput] = useState<PublishToCollectionInput | null>(null);
  const [addToCommonsLib, setAddToCommonsLib] = useState(false);
  const [commons, setCommons] = useState<PlayMetadataDetails | null>(null);
  const [synopsis, setSynopsis] = useState("");
  const trpc = useTRPC();
  const navigate = useNavigate();

  const commonsMode = Boolean(props.allowAddToCommons && addToCommonsLib && props.metadata);

  useEffect(() => {
    if (props.metadata) {
      setCommons({ ...props.metadata });
      // the title input is pre-filled in commons mode: Create must be enabled
      // without requiring an edit
      setCreateReady(props.metadata.title.length > 0);
    }
  }, [props.metadata]);

  const handleTitleChange = () => {
    const value = titleInputRef.current?.value ?? "";
    setCreateReady(value.length > 0);
    if (commonsMode && commons) {
      setCommons({ ...commons, title: value });
    }
  };

  const buildPublishInput = (): PublishToCollectionInput | null => {
    if (!commons) {
      return null;
    }
    return {
      title: commons.title,
      author: commons.author,
      lang: commons.language === "en" ? "en" : "fr",
      numberOfRoles: commons.number_of_roles,
      numberOfMaleRoles: commons.number_of_male_roles,
      numberOfFemaleRoles: commons.number_of_female_roles,
      genre: commons.genre ? commons.genre : undefined,
      period: commons.period ? commons.period : undefined,
      synopsis: synopsis.trim() ? synopsis : undefined,
    };
  };

  const handleCreate = async () => {
    const title = titleInputRef.current?.value ?? "New play";
    setPending(true);
    setPublishError(false);
    setCreateError(null);
    if (commonsMode && props.publishToCollection) {
      // commons mode: publish the imported script to the collection only,
      // no personal play is created
      const input = buildPublishInput();
      if (!input) {
        setPending(false);
        return;
      }
      setLastPublishInput(input);
      try {
        const res = await props.publishToCollection(input);
        setDone({ kind: "collection", uri: res.uri });
      } catch (error) {
        logger.error("failed to publish play to the collection", { error });
        setPublishError(true);
        setPending(false);
      }
      return;
    }
    try {
      const data = await props.createPlay(title);
      setDone({ kind: "play", uri: data.uri });
    } catch (error) {
      logger.error("failed to create play", { error });
      setCreateError(error instanceof Error ? error.message : String(error));
      setPending(false);
    }
  };

  const handleRetryPublish = async () => {
    if (!lastPublishInput || !props.publishToCollection) {
      return;
    }
    setPending(true);
    setPublishError(false);
    try {
      const res = await props.publishToCollection(lastPublishInput);
      setDone({ kind: "collection", uri: res.uri });
    } catch (error) {
      logger.error("failed to publish play to the collection", { error });
      setPublishError(true);
    } finally {
      setPending(false);
    }
  };

  const queryOpts = trpc.plays.playDetails.queryOptions({
    uri: done?.kind === "play" ? done.uri : "",
  });
  queryOpts.enabled = done?.kind === "play";
  const { isSuccess: isQuerySuccess } = useQuery(queryOpts);
  useEffect(() => {
    if (!done) {
      return;
    }
    if (done.kind === "collection") {
      navigate({ pathname: `/collection/edit/${done.uri}` });
    } else if (isQuerySuccess) {
      navigate({ pathname: `/plays/edit/${done.uri}` });
    }
  }, [done, isQuerySuccess, navigate]);

  const { genres, periods } = useCollectionMetadataContext();
  const handleToggleAddToCommons = () => {
    setAddToCommonsLib((prev) => !prev);
  };
  const sourceLabel = props.sourceLabel ?? "Create from an external source";
  const flowTitle =
    addToCommonsLib && props.allowAddToCommons
      ? `${sourceLabel} ▶ Add details to public play`
      : `${sourceLabel} ▶ Name your new play`;

  const roleOptions = Array.from({ length: 20 }, (_, i) => ({
    label: `${i + 1}`,
    value: `${i + 1}`,
  }));

  const updateCommons = (patch: Partial<PlayMetadataDetails>) => {
    setCommons((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  return (
    <>
      {props.allowAddToCommons ? (
        <Admonition type="info" title="Administator commands">
          <ToggleButton
            label="Add to commons library"
            onToggle={handleToggleAddToCommons}
            value={addToCommonsLib}
          />
        </Admonition>
      ) : null}
      <FlowStep
        title={flowTitle}
        Actions={
          <>
            <Button icon="previous" onClick={props.onBack} />
            {publishError && lastPublishInput ? (
              <Button icon="redo" disabled={pending} onClick={handleRetryPublish}>
                Retry publish
              </Button>
            ) : null}
            <Button
              disabled={!createReady || pending}
              icon={pending ? "animatedWaiting" : "newPlay"}
              onClick={handleCreate}
            >
              Create
            </Button>
          </>
        }
      >
        {createError ? (
          <div role="alert" style={{ color: "#b00020" }}>
            Failed to create the play: {createError}
          </div>
        ) : null}
        {publishError ? (
          <div role="alert" style={{ color: "#b00020" }}>
            The script could not be added to the commons library. You can retry publishing or go
            back.
          </div>
        ) : null}
        {commonsMode && commons ? (
          <>
            <div className={styles.row}>
              <label>Title</label>
              <input
                placeholder=""
                ref={titleInputRef}
                type="text"
                size={60}
                maxLength={100}
                onChange={handleTitleChange}
                value={commons.title}
              />
            </div>
            <div className={styles.row}>
              <label>Author</label>
              <input
                type="text"
                size={60}
                maxLength={100}
                value={commons.author}
                onChange={(e) => updateCommons({ author: e.target.value })}
              />
            </div>
            <div className={styles.row}>
              <label>Language</label>
              <CardsSelect
                value={commons.language}
                onChange={(values) => updateCommons({ language: values[0] ?? "fr" })}
                options={[
                  { label: "FR", value: "fr" },
                  { label: "EN", value: "en" },
                ]}
              />
            </div>
            <div className={styles.row}>
              <label>Number of roles</label>
              <CardsSelect
                value={String(commons.number_of_roles)}
                onChange={(values) =>
                  updateCommons({ number_of_roles: Number.parseInt(values[0] ?? "0", 10) || 0 })
                }
                options={roleOptions}
              />
            </div>
            <div className={styles.row}>
              <label>Number of male roles</label>
              <CardsSelect
                value={String(commons.number_of_male_roles)}
                onChange={(values) =>
                  updateCommons({
                    number_of_male_roles: Number.parseInt(values[0] ?? "0", 10) || 0,
                  })
                }
                options={roleOptions}
              />
            </div>
            <div className={styles.row}>
              <label>Number of female roles</label>
              <CardsSelect
                value={String(commons.number_of_female_roles)}
                onChange={(values) =>
                  updateCommons({
                    number_of_female_roles: Number.parseInt(values[0] ?? "0", 10) || 0,
                  })
                }
                options={roleOptions}
              />
            </div>
            <div className={styles.row}>
              <label>Genre</label>
              <CardsSelect
                value={commons.genre ?? ""}
                onChange={(values) => updateCommons({ genre: values[0] ?? "" })}
                options={genres.map((genre) => ({ label: genre, value: genre }))}
              />
            </div>
            <div className={styles.row}>
              <label>Period</label>
              <CardsSelect
                value={commons.period ?? ""}
                onChange={(values) => updateCommons({ period: values[0] ?? "" })}
                options={periods.map((period) => ({ label: period, value: period }))}
              />
            </div>
            <div className={styles.row}>
              <label>Synopsys</label>
              <textarea rows={10} value={synopsis} onChange={(e) => setSynopsis(e.target.value)} />
            </div>
          </>
        ) : (
          <>
            Give a name to your project.
            <Admonition type="info">
              This name doesn't need to correspond to the title of the play. For instance you might
              also want to indicate the name of the troupe or company, and maybe the year.
              <br />
              You'll be able to change it later on !
            </Admonition>
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                gap: "4px",
                alignItems: "center",
              }}
            >
              <label>Project name</label>
              <input
                placeholder="Othello - Shakespeare (Troupe Name / 2026)"
                ref={titleInputRef}
                type="text"
                size={60}
                maxLength={100}
                onChange={handleTitleChange}
              />
            </div>
          </>
        )}
      </FlowStep>
    </>
  );
}
