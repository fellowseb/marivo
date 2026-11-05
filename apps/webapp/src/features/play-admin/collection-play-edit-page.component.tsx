import { Suspense } from "react";
import { NavLink, Route, Routes, useParams } from "react-router";
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

export const COLLECTION_URI_PARAM = "uri";
export const COLLECTION_EDIT_ROUTE = `/collection/edit/:${COLLECTION_URI_PARAM}`;

/** Single-tab menubar so the page shares the play page's header layout (menu + toolbar). */
const COLLECTION_EDIT_MENU: MenuBarDefinition = {
  items: [{ label: "Script", icon: "script", path: "." }],
};

export function CollectionPlayEditBreadcrumbs() {
  const params = useParams();
  const uri = params[COLLECTION_URI_PARAM] ?? "";
  const trpc = useTRPC();
  const detailsQuery = useQuery(trpc.playsCollection.getDetails.queryOptions({ uri }));
  const title = detailsQuery.data?.title ?? "…";
  return (
    <HeaderBreadcrumbs
      key="collection-edit"
      crumbs={[
        <NavLink to={{ pathname: "/plays/new/from-collection" }}>Scripts collection</NavLink>,
        <TitleTab title={title} />,
      ]}
    />
  );
}

/**
 * Edit page for a public-domain collection play (`/collection/edit/:uri`).
 * Shares the play page's layout (breadcrumb tab, menubar, script toolbar and
 * script container) and reuses the script edition UI with `from="collection"`;
 * write mutations are authorized server-side via the `edit_collection_play_script`
 * capability.
 */
export default function CollectionPlayEditPage() {
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
            <ScriptContextProvider uri={uri} from="collection">
              <ScriptEditionContextProvider uri={uri} from="collection">
                <MainLayoutBase
                  breadcrumbs={
                    <Routes>
                      <Route path="*" element={<CollectionPlayEditBreadcrumbs />} />
                    </Routes>
                  }
                  Menu={<MenuBar definition={COLLECTION_EDIT_MENU} />}
                  Toolbar={<ScriptToolbar />}
                >
                  <ScriptTab />
                </MainLayoutBase>
              </ScriptEditionContextProvider>
            </ScriptContextProvider>
          </ScriptUndoRedoContextProvider>
        </ScriptTabToolbarContextProvider>
      </Suspense>
    </ErrorBoundary>
  );
}
