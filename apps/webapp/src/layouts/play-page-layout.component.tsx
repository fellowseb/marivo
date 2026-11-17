import { Suspense, type PropsWithChildren } from "react";
import { Route, Routes } from "react-router";
import { useTranslation } from "react-i18next";
import { usePlayContext } from "../features/play-admin/play.context";
import { MainLayoutBase } from "./main-layout";
import { makePlayMenuDefinition } from "../features/play-admin/play-page-menubar";
import { MenuBar } from "../components/menubar.component";
import Toolbar from "../components/toolbar.component";
import { PlayPageBreadcrumbs } from "../features/play-admin/play-page.component";
import { ScriptToolbar } from "../features/script-edition/script-tab-toolbar";
import { BLOCKING_TOOLBAR } from "../features/blocking/blocking-tab-toolbar";
import { MEMORIZE_TOOLBAR } from "../features/lines-memorization/memorize-tab-toolbar";
import DotsLoader from "../components/dots-loader.component";
import PageNotFound from "../components/page-not-found.component";

/** centered loader for the main area while play/script data is loading */
function CenteredLoader() {
  return (
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
  );
}

function PlayPageLayout(props: PropsWithChildren) {
  const playContext = usePlayContext();
  const { t } = useTranslation("layout");
  const menuDefinition = makePlayMenuDefinition(t);
  return (
    <MainLayoutBase
      breadcrumbs={
        <Routes>
          <Route path={`*`} element={<PlayPageBreadcrumbs />} />
        </Routes>
      }
      Menu={
        playContext?.isOk() ? (
          <Routes>
            <Route path={`*`} element={<MenuBar definition={menuDefinition} />} />
          </Routes>
        ) : null
      }
      Toolbar={
        playContext?.isOk() ? (
          <Routes>
            <Route path={`script`} element={<ScriptToolbar />} />
            <Route path={`blocking`} element={<Toolbar definition={BLOCKING_TOOLBAR} />} />
            <Route path={`memorize`} element={<Toolbar definition={MEMORIZE_TOOLBAR} />} />
          </Routes>
        ) : null
      }
    >
      {/* the header stays mounted: only the main area is replaced while
          play details or the script are loading */}
      {playContext?.match({
        success() {
          return <Suspense fallback={<CenteredLoader />}>{props.children}</Suspense>;
        },
        failure() {
          return <PageNotFound />;
        },
      }) ?? <CenteredLoader />}
    </MainLayoutBase>
  );
}

export default PlayPageLayout;
