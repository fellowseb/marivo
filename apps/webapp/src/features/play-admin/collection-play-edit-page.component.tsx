import { Suspense } from "react";
import { NavLink, useParams } from "react-router";
import ErrorBoundary from "../../components/error-boundary.component";
import PageNotFound from "../../components/page-not-found.component";
import DotsLoader from "../../components/dots-loader.component";
import { HeaderBreadcrumbs } from "../../layouts/header.component";
import { ScriptContextProvider } from "../script/script.context";
import { ScriptEditionContextProvider } from "../script/script-edition.context";
import { ScriptUndoRedoContextProvider } from "../script/script-undo-redo.context";
import { ScriptTabToolbarContextProvider } from "../script-edition/script-tab-toolbar.context";
import ScriptTab from "../script-edition/script-tab.component";

export const COLLECTION_URI_PARAM = "uri";
export const COLLECTION_EDIT_ROUTE = `/collection/edit/:${COLLECTION_URI_PARAM}`;

export function CollectionPlayEditBreadcrumbs() {
  return (
    <HeaderBreadcrumbs
      key="collection-edit"
      crumbs={[
        <NavLink to={{ pathname: "/plays/new/from-collection" }}>Scripts collection</NavLink>,
        "Edit",
      ]}
    />
  );
}

/**
 * Edit page for a public-domain collection play (`/collection/edit/:uri`).
 * Reuses the script edition UI with `from="collection"`; write mutations are
 * authorized server-side via the `edit_collection_play_script` capability.
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
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    flex: 1,
                    alignSelf: "stretch",
                    minHeight: 0,
                  }}
                >
                  <ScriptTab />
                </div>
              </ScriptEditionContextProvider>
            </ScriptContextProvider>
          </ScriptUndoRedoContextProvider>
        </ScriptTabToolbarContextProvider>
      </Suspense>
    </ErrorBoundary>
  );
}
