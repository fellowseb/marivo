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

interface NamePlayStepProps {
  onBack: () => void;
  /** Pre-fill/details for the "add to commons" variant (import flow only). */
  metadata?: PlayMetadataDetails;
  allowAddToCommons?: boolean;
  /** Creates the play and resolves with its uri. */
  createPlay: (title: string) => Promise<{ uri: string }>;
}

/**
 * Shared "name your new play" step, used by both the import flow and the
 * collection flow. On success it navigates to the new play's edit page.
 */
export function NamePlayStep(props: NamePlayStepProps) {
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [createReady, setCreateReady] = useState(false);
  const [pending, setPending] = useState(false);
  const [createdUri, setCreatedUri] = useState<string | null>(null);
  const trpc = useTRPC();
  const navigate = useNavigate();

  const handleTitleChange = () => {
    setCreateReady((titleInputRef.current?.value ?? "").length > 0);
  };
  const handleCreate = async () => {
    const title = titleInputRef.current?.value ?? "New play";
    setPending(true);
    try {
      const data = await props.createPlay(title);
      setCreatedUri(data.uri);
    } catch (error) {
      logger.error("failed to create play", { error });
      setPending(false);
    }
  };

  const queryOpts = trpc.plays.playDetails.queryOptions({
    uri: createdUri ?? "",
  });
  queryOpts.enabled = !!createdUri;
  const { isSuccess: isQuerySuccess } = useQuery(queryOpts);
  useEffect(() => {
    if (isQuerySuccess && createdUri) {
      navigate({
        pathname: `/plays/edit/${createdUri}`,
      });
    }
  }, [isQuerySuccess, createdUri, navigate]);

  const [addToCommonsLib, setAddToCommonsLib] = useState(false);
  const { genres, periods } = useCollectionMetadataContext();
  const handleToggleAddToCommons = () => {
    setAddToCommonsLib((prev) => !prev);
  };
  const flowTitle =
    addToCommonsLib && props.allowAddToCommons
      ? "Create from an external source ▶ Add details to public play"
      : "Create from an external source ▶ Name your new play";

  const roleOptions = Array.from({ length: 20 }, (_, i) => ({
    label: `${i + 1}`,
    value: `${i + 1}`,
  }));

  return (
    <>
      {props.allowAddToCommons ? (
        <Admonition type="info" title="Administator commands">
          <ToggleButton
            label="Add to commons library"
            onToggle={handleToggleAddToCommons}
            value={false}
          />
        </Admonition>
      ) : null}
      <FlowStep
        title={flowTitle}
        Actions={
          <>
            <Button icon="previous" onClick={props.onBack} />
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
        {addToCommonsLib && props.allowAddToCommons && props.metadata ? (
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
                value={props.metadata.title}
              />
            </div>
            <div className={styles.row}>
              <label>Author</label>
              <input type="text" size={60} maxLength={100} value={props.metadata.author} />
            </div>
            <div className={styles.row}>
              <label>Language</label>
              <CardsSelect
                value={props.metadata.language}
                options={[
                  { label: "FR", value: "fr" },
                  { label: "EN", value: "en" },
                ]}
              />
            </div>
            <div className={styles.row}>
              <label>Number of roles</label>
              <CardsSelect value={"" + props.metadata.number_of_roles} options={roleOptions} />
            </div>
            <div className={styles.row}>
              <label>Number of male roles</label>
              <CardsSelect
                value={String(props.metadata.number_of_male_roles)}
                options={roleOptions}
              />
            </div>
            <div className={styles.row}>
              <label>Number of female roles</label>
              <CardsSelect
                value={String(props.metadata.number_of_female_roles)}
                options={roleOptions}
              />
            </div>
            <div className={styles.row}>
              <label>Genre</label>
              <CardsSelect
                value={props.metadata.genre}
                options={genres.map((genre) => ({ label: genre, value: genre }))}
              />
            </div>
            <div className={styles.row}>
              <label>Period</label>
              <CardsSelect
                value={props.metadata.period}
                options={periods.map((period) => ({ label: period, value: period }))}
              />
            </div>
            <div className={styles.row}>
              <label>Synopsys</label>
              <textarea rows={10} />
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
