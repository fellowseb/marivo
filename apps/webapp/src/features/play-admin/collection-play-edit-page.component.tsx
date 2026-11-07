import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { Suspense } from "react";
import { Navigate, NavLink, Route, Routes, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import ErrorBoundary from "../../components/error-boundary.component";
import PageNotFound from "../../components/page-not-found.component";
import DotsLoader from "../../components/dots-loader.component";
import { TitleTab } from "../../components/title-tab.component";
import { HeaderBreadcrumbs } from "../../layouts/header.component";
import { MainLayoutBase } from "../../layouts/main-layout";
import { MenuBar, type MenuBarDefinition } from "../../components/menubar.component";
import { useTRPC } from "../../trpc";
import { ScriptContextProvider } from "../script/script.context";
import { ScriptEditionContextProvider } from "../script/script-edition.context";
import { ScriptUndoRedoContextProvider } from "../script/script-undo-redo.context";
import { ScriptTabToolbarContextProvider } from "../script-edition/script-tab-toolbar.context";
import { ScriptToolbar } from "../script-edition/script-tab-toolbar";
import ScriptTab from "../script-edition/script-tab.component";
import { CollectionPlaySettings } from "./collection-play-settings.component";

export const COLLECTION_URI_PARAM = "uri";
export const COLLECTION_EDIT_ROUTE = `/collection/edit/:${COLLECTION_URI_PARAM}/*`;

/** Menubar with the script and settings sub-tabs, like the play page (`../` = up from the sub-route). */
function makeCollectionEditMenu(t: TFunction<"collection">): MenuBarDefinition {
  return {
    items: [
      { label: t("editMenu.script"), icon: "script", path: "../script" },
      { label: t("editMenu.settings"), icon: "settings", path: "../settings" },
    ],
  };
}

export function CollectionPlayEditBreadcrumbs(props: { uri: string }) {
  const { t } = useTranslation("collection");
  const trpc = useTRPC();
  const detailsQuery = useQuery(trpc.playsCollection.getDetails.queryOptions({ uri: props.uri }));
  const title = detailsQuery.data?.title ?? "…";
  return (
    <HeaderBreadcrumbs
      key="collection-edit"
      crumbs={[
        <NavLink to={{ pathname: "/plays/new/from-collection" }}>{t("editBreadcrumb")}</NavLink>,
        <TitleTab title={title} />,
      ]}
    />
  );
}

/**
 * Edit page for a public-domain collection play (`/collection/edit/:uri`),
 * with `script` (default) and `settings` sub-routes. Shares the play page's
 * layout (breadcrumb tab, menubar, script toolbar and script container).
 * Script writes are authorized server-side via the
 * `edit_collection_play_script` capability.
 */
export default function CollectionPlayEditPage() {
  const { t } = useTranslation("collection");
  const params = useParams();
  const uri = params[COLLECTION_URI_PARAM];
  if (!uri) {
    return null;
  }
  return (
    <ErrorBoundary fallback={<PageNotFound />}>
      <Suspense
        fallback={
          <div
            style={{
              flex: "1",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <DotsLoader size="xlarge" />
          </div>
        }
      >
        <ScriptTabToolbarContextProvider>
          <ScriptUndoRedoContextProvider>
            <MainLayoutBase
              breadcrumbs={<CollectionPlayEditBreadcrumbs uri={uri} />}
              Menu={<MenuBar definition={makeCollectionEditMenu(t)} />}
              Toolbar={
                <Routes>
                  <Route path="script" element={<ScriptToolbar />} />
                  <Route path="*" element={null} />
                </Routes>
              }
            >
              <Routes>
                <Route index element={<Navigate to="script" replace />} />
                <Route
                  path="script"
                  element={
                    <ScriptContextProvider uri={uri} from="collection">
                      <ScriptEditionContextProvider uri={uri} from="collection">
                        <ScriptTab />
                      </ScriptEditionContextProvider>
                    </ScriptContextProvider>
                  }
                />
                <Route path="settings" element={<CollectionPlaySettings uri={uri} />} />
                <Route path="*" element={<PageNotFound />} />
              </Routes>
            </MainLayoutBase>
          </ScriptUndoRedoContextProvider>
        </ScriptTabToolbarContextProvider>
      </Suspense>
    </ErrorBoundary>
  );
}
