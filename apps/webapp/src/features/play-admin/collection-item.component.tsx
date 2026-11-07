import { useTranslation } from "react-i18next";
import Icon from "../../components/icon.component";
import { ItemListItem } from "../../components/item-list/item-list.component";
import styles from "./collection-item.module.css";

interface CollectionItemProps {
  title: string;
  lang: string;
  genre: string | null;
  period: string | null;
  numberOfRoles: number | null;
  numberOfMaleRoles: number | null;
  numberOfFemaleRoles: number | null;
  bookmarked: boolean;
  archived: boolean;
  selected: boolean;
  onSelect: () => void;
}

export function CollectionItem(props: CollectionItemProps) {
  const { t } = useTranslation("collection");
  const roles =
    props.numberOfMaleRoles != null && props.numberOfFemaleRoles != null
      ? t("item.rolesMaleFemale", {
          male: props.numberOfMaleRoles,
          female: props.numberOfFemaleRoles,
        })
      : props.numberOfRoles != null
        ? t("item.rolesCount", { count: props.numberOfRoles })
        : null;
  const meta = [props.lang.toUpperCase(), props.genre, props.period, roles]
    .filter(Boolean)
    .join(" · ");
  return (
    <ItemListItem
      onClick={props.onSelect}
      selected={props.selected}
      title={
        <>
          {props.title}
          {props.archived ? (
            <span className={styles.archivedBadge}>{t("item.archived")}</span>
          ) : null}
        </>
      }
      trailing={
        props.bookmarked ? (
          <span className={styles.bookmark} role="img" aria-label={t("item.bookmarked")}>
            <Icon value="memorize" size="medium" mode="primary" />
          </span>
        ) : null
      }
      details={<span className={styles.meta}>{meta}</span>}
    />
  );
}
