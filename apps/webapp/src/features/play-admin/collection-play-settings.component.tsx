import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/react";
import classNames from "classnames";
import { hasCapability, parseRole } from "@marivo/utils";
import { useTRPC } from "../../trpc";
import Button from "../../components/button.component";
import { CardsSelect } from "../../components/cards-select.component";
import { useCollectionMetadataContext } from "./collection-metadata.context";
import { useNotifications } from "../../components/notifications.context";
import styles from "./collection-play-settings.module.css";

interface MetadataForm {
  title: string;
  author: string;
  language: string;
  numberOfRoles: string;
  numberOfMaleRoles: string;
  numberOfFemaleRoles: string;
  genre: string;
  period: string;
  synopsis: string;
}

const roleOptions = Array.from({ length: 20 }, (_, i) => ({
  label: `${i + 1}`,
  value: `${i + 1}`,
}));

/**
 * Settings sub-page of a collection play (`/collection/edit/:uri/settings`):
 * editable script metadata plus Archive and Delete actions. Actions are
 * gated client-side by capability and enforced server-side.
 */
export function CollectionPlaySettings(props: { uri: string }) {
  const trpc = useTRPC();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showNotification } = useNotifications();
  const { user } = useUser();
  const role = parseRole((user?.publicMetadata as { role?: unknown } | undefined)?.role);
  const canEditMetadata = hasCapability(role, "edit_collection_play_metadata");
  const canDelete = hasCapability(role, "delete_collection_play");
  const { genres, periods } = useCollectionMetadataContext();

  const detailsQuery = useQuery(trpc.playsCollection.getDetails.queryOptions({ uri: props.uri }));
  const details = detailsQuery.data;

  const [form, setForm] = useState<MetadataForm | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (details && !form) {
      setForm({
        title: details.title,
        author: details.author,
        language: details.lang,
        numberOfRoles: details.numberOfRoles != null ? String(details.numberOfRoles) : "",
        numberOfMaleRoles:
          details.numberOfMaleRoles != null ? String(details.numberOfMaleRoles) : "",
        numberOfFemaleRoles:
          details.numberOfFemaleRoles != null ? String(details.numberOfFemaleRoles) : "",
        genre: details.genre ?? "",
        period: details.period ?? "",
        synopsis: details.synopsis ?? "",
      });
    }
  }, [details, form]);

  const invalidate = () => {
    void queryClient.invalidateQueries({
      queryKey: trpc.playsCollection.getDetails.queryKey(),
    });
    void queryClient.invalidateQueries({
      queryKey: trpc.playsCollection.listAll.queryKey(),
    });
  };

  const updateMutation = useMutation(
    trpc.playsCollection.updateMetadata.mutationOptions({
      onSuccess: () => {
        setError(null);
        invalidate();
        showNotification({ type: "info", message: "Metadata saved" });
      },
      onError: (e) => setError(e.message),
    }),
  );
  const archiveMutation = useMutation(
    trpc.playsCollection.setArchived.mutationOptions({
      onSuccess: () => {
        setError(null);
        invalidate();
      },
      onError: (e) => setError(e.message),
    }),
  );
  const deleteMutation = useMutation(
    trpc.playsCollection.delete.mutationOptions({
      onSuccess: () => {
        invalidate();
        navigate("/plays/new/from-collection");
      },
      onError: (e) => {
        setError(e.message);
        setShowDeleteConfirm(false);
      },
    }),
  );

  if (!details || !form) {
    return null;
  }

  const set = (patch: Partial<MetadataForm>) => setForm({ ...form, ...patch });
  const num = (v: string) => (v === "" ? undefined : Number.parseInt(v, 10));

  const handleSave = () => {
    updateMutation.mutate({
      uri: props.uri,
      title: form.title,
      author: form.author,
      lang: form.language === "en" ? "en" : "fr",
      numberOfRoles: num(form.numberOfRoles),
      numberOfMaleRoles: num(form.numberOfMaleRoles),
      numberOfFemaleRoles: num(form.numberOfFemaleRoles),
      genre: form.genre || undefined,
      period: form.period || undefined,
      synopsis: form.synopsis.trim() ? form.synopsis : undefined,
    });
  };

  return (
    <div className={styles.container}>
      {details.archived ? (
        <div className={styles.archivedNote}>
          This script is archived and hidden from the collection for normal users.
        </div>
      ) : null}
      {error ? (
        <div role="alert" className={styles.error}>
          {error}
        </div>
      ) : null}
      <div className={styles.line}>
        <label>Title</label>
        <input
          type="text"
          size={60}
          maxLength={100}
          value={form.title}
          disabled={!canEditMetadata}
          onChange={(e) => set({ title: e.target.value })}
        />
      </div>
      <div className={styles.line}>
        <label>Author</label>
        <input
          type="text"
          size={60}
          maxLength={64}
          value={form.author}
          disabled={!canEditMetadata}
          onChange={(e) => set({ author: e.target.value })}
        />
      </div>
      <div className={styles.line}>
        <label>Language</label>
        <CardsSelect
          value={form.language}
          onChange={(values) => set({ language: values[0] ?? "fr" })}
          options={[
            { label: "FR", value: "fr" },
            { label: "EN", value: "en" },
          ]}
        />
      </div>
      <div className={styles.line}>
        <label>Number of roles</label>
        <CardsSelect
          value={form.numberOfRoles}
          onChange={(values) => set({ numberOfRoles: values[0] ?? "" })}
          options={roleOptions}
        />
      </div>
      <div className={styles.line}>
        <label>Number of male roles</label>
        <CardsSelect
          value={form.numberOfMaleRoles}
          onChange={(values) => set({ numberOfMaleRoles: values[0] ?? "" })}
          options={roleOptions}
        />
      </div>
      <div className={styles.line}>
        <label>Number of female roles</label>
        <CardsSelect
          value={form.numberOfFemaleRoles}
          onChange={(values) => set({ numberOfFemaleRoles: values[0] ?? "" })}
          options={roleOptions}
        />
      </div>
      <div className={styles.line}>
        <label>Genre</label>
        <CardsSelect
          value={form.genre}
          onChange={(values) => set({ genre: values[0] ?? "" })}
          options={genres.map((genre) => ({ label: genre, value: genre }))}
        />
      </div>
      <div className={styles.line}>
        <label>Period</label>
        <CardsSelect
          value={form.period}
          onChange={(values) => set({ period: values[0] ?? "" })}
          options={periods.map((period) => ({ label: period, value: period }))}
        />
      </div>
      <div className={styles.line}>
        <label>Synopsis</label>
        <textarea
          rows={6}
          cols={60}
          value={form.synopsis}
          disabled={!canEditMetadata}
          onChange={(e) => set({ synopsis: e.target.value })}
        />
      </div>
      {canEditMetadata ? (
        <div className={styles.line}>
          <label>Metadata</label>
          <Button icon="save" disabled={updateMutation.isPending} onClick={handleSave}>
            Save
          </Button>
          <Button
            icon="archive"
            disabled={archiveMutation.isPending}
            onClick={() => archiveMutation.mutate({ uri: props.uri, archived: !details.archived })}
          >
            {details.archived ? "Unarchive" : "Archive"}
          </Button>
        </div>
      ) : null}
      <div className={classNames([styles.section, styles.sectionDanger])}>
        <div className={styles.sectionTitle}>Danger zone</div>
        <div className={styles.line}>
          <label>Delete the script</label>
          <Button icon="delete" disabled={!canDelete} onClick={() => setShowDeleteConfirm(true)}>
            Delete
          </Button>
        </div>
      </div>
      {showDeleteConfirm ? (
        <div className={styles.modalContainer} onClick={() => setShowDeleteConfirm(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <div>
              Delete &quot;{details.title}&quot; from the public collection? This cannot be undone.
            </div>
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <Button onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
              <Button
                icon="delete"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate({ uri: props.uri })}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
