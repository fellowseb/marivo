import { useState } from "react";
import { NavLink } from "react-router";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import classNames from "classnames";
import { useTRPC } from "../../trpc";
import styles from "./plays-list.module.css";
import Skeleton from "../../components/skeleton.component";
import Container from "../../components/container.component";
import Flex from "../../components/flex.component";
import { ItemList, ItemListItem } from "../../components/item-list/item-list.component";
import PlaysFilters, { DEFAULT_FILTER_OPTIONS } from "./plays-filters.component";
import { filterSortPlays, type PlayFilterSortOptions } from "./plays.lib";
import { PlayInvites } from "./play-invites.component";
import UnexpectedError from "../../components/unexpected-error.component";
import DotsLoader from "../../components/dots-loader.component";
import { PLAY_ROUTE_BASE } from "./play-page.component";

interface PlayListItemProps {
  id: string;
  title: string;
  ownerFullName?: string;
  ownerUsername?: string;
  isOwner: boolean;
  creationDate: Date;
  lastModifiedDate?: Date;
}

function PlayListItem(props: PlayListItemProps) {
  const { t, i18n } = useTranslation("plays");
  const ownerStr = props.isOwner
    ? t("listItem.ownedByYou")
    : t("listItem.ownedByOther", { name: props.ownerFullName, username: props.ownerUsername });
  return (
    <ItemListItem
      to={PLAY_ROUTE_BASE.replace(":uri", props.id)}
      title={props.title}
      details={
        <>
          {t("listItem.ownedBy")} <span className={styles.playDetailsValues}>{ownerStr}</span>{" "}
          {t("listItem.createdOn")}{" "}
          <span className={styles.playDetailsValues}>
            {props.creationDate.toLocaleString(i18n.language)}
          </span>{" "}
          {t("listItem.lastModifiedOn")}{" "}
          <span className={styles.playDetailsValues}>
            {props.lastModifiedDate ? props.lastModifiedDate.toLocaleString(i18n.language) : "—"}
          </span>
        </>
      }
    >
      <div className={styles.playPoster}>
        <div
          className={classNames({
            [styles.playPosterOverlay]: true,
          })}
        ></div>
      </div>
    </ItemListItem>
  );
}

function NoFilteredPlays() {
  const { t } = useTranslation("plays");
  return (
    <div className={styles.noPlaysContainer}>
      <p>{t("noFilteredPlays")}</p>
    </div>
  );
}

function NoPlays() {
  const { t } = useTranslation("plays");
  return (
    <div className={styles.noPlaysContainer}>
      <p>{t("noPlays.title")}</p>
      <p>{t("noPlays.invitesHint")}</p>
      <p>
        {t("noPlays.createYourselfPrefix")}{" "}
        <NavLink
          to={{
            pathname: "new",
          }}
        >
          {t("noPlays.createYourselfLink")}
        </NavLink>
        {". "}
      </p>
    </div>
  );
}

function PlayList() {
  const trpc = useTRPC();
  const query = useQuery(trpc.plays.list.queryOptions());
  const [filters, setFilters] = useState<PlayFilterSortOptions>(DEFAULT_FILTER_OPTIONS);
  const handleFiltersChange = (filters: PlayFilterSortOptions) => {
    setFilters(filters);
  };
  const plays = query.data?.plays ?? [];
  const invites = query.data?.invites ?? [];
  const filteredPlays = filterSortPlays(plays, filters);
  const handleRespondedToInvite = () => {
    query.refetch();
  };
  return (
    <Flex direction="column" grow={1} gap="10px">
      <PlaysFilters onFiltersChange={handleFiltersChange} filters={filters} />
      <Container className={styles.playsListContainer}>
        <ItemList>
          {invites.length ? (
            <PlayInvites invites={invites} respondedToInvite={handleRespondedToInvite} />
          ) : null}
          {query.isError ? (
            <UnexpectedError error={query.error?.message} />
          ) : query.isLoading ? (
            <>
              <li className={styles.playSkeleton}>
                <Skeleton hideImage={true} />
              </li>
              <li className={styles.playSkeleton}>
                <Skeleton hideImage={true} />
              </li>
              <li className={styles.playSkeleton}>
                <Skeleton hideImage={true} />
              </li>
              <li className={styles.playSkeleton}>
                <Skeleton hideImage={true} />
              </li>
            </>
          ) : plays.length ? (
            filteredPlays.length ? (
              filteredPlays.map(
                ({
                  uri,
                  isOwner,
                  title,
                  lastModifiedDate,
                  createdDate,
                  ownerUsername,
                  ownerFullName,
                }) => (
                  <PlayListItem
                    key={uri}
                    id={uri}
                    ownerUsername={ownerUsername}
                    ownerFullName={ownerFullName}
                    isOwner={isOwner}
                    title={title}
                    lastModifiedDate={lastModifiedDate}
                    creationDate={createdDate}
                  />
                ),
              )
            ) : (
              <NoFilteredPlays />
            )
          ) : (
            <NoPlays />
          )}
          {query.isRefetching ? (
            <div className={styles.loaderContainer}>
              <DotsLoader />
            </div>
          ) : null}
        </ItemList>
      </Container>
    </Flex>
  );
}

export default PlayList;
