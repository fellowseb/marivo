import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { NavLink, useNavigate } from "react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import Button from "../../components/button.component";
import { useTRPC } from "../../trpc";
import Admonition from "../../components/admonition.component";
import { HeaderBreadcrumbs } from "../../layouts/header.component";
import FlowStep from "../../components/flow-step.component";

export function NewEmptyScriptBreadcrumbs() {
  const { t } = useTranslation();
  return (
    <HeaderBreadcrumbs
      key="new-empty-script"
      crumbs={[
        <NavLink
          to={{
            pathname: "/plays/new",
          }}
        >
          {t("layout:newPlay")}
        </NavLink>,
        <NavLink
          to={{
            pathname: "/plays/new/empty",
          }}
        >
          {t("newPlay:empty.breadcrumb")}
        </NavLink>,
      ]}
    />
  );
}

function NewEmptyScript() {
  const { t } = useTranslation("newPlay");
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [createReady, setCreateReady] = useState(false);
  const handleTitleChange = () => {
    setCreateReady((titleInputRef.current?.value ?? "").length > 0);
  };
  const trpc = useTRPC();
  const { mutate, isPending, isSuccess, data } = useMutation(trpc.plays.create.mutationOptions());
  const navigate = useNavigate();
  const handleCreate = () => {
    const title = titleInputRef.current?.value ?? t("nameStep.defaultTitle");
    mutate({ title });
  };
  const [createdUri, setCreatedUri] = useState<string | null>(null);
  const queryOpts = trpc.plays.playDetails.queryOptions({
    uri: createdUri ?? "",
  });
  queryOpts.enabled = !!createdUri;
  const {
    isSuccess: isQuerySuccess,
    isPending: isQueryPending,
    isEnabled: isQueryEnabled,
  } = useQuery(queryOpts);
  useEffect(() => {
    if (isSuccess && data?.uri) {
      setCreatedUri(data.uri);
    }
  }, [isSuccess, data?.uri]);
  useEffect(() => {
    if (isQuerySuccess) {
      navigate({
        pathname: `/plays/edit/${createdUri}`,
      });
    }
  }, [isQuerySuccess, createdUri]);
  const handlePrevious = () => {
    navigate("/plays/new");
  };
  return (
    <FlowStep
      title={t("empty.title")}
      Actions={
        <>
          <Button icon="previous" onClick={handlePrevious} />
          <Button
            disabled={!createReady}
            icon={isPending || (isQueryPending && isQueryEnabled) ? "animatedWaiting" : "newPlay"}
            onClick={handleCreate}
          >
            Create
          </Button>
        </>
      }
    >
      {t("nameStep.intro")}
      <Admonition type="info">
        {t("nameStep.introAdmonition.line1")}
        <br />
        {t("nameStep.introAdmonition.line2")}
      </Admonition>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          gap: "4px",
          alignItems: "center",
        }}
      >
        <label>{t("nameStep.projectName")}</label>
        <input
          placeholder={t("nameStep.projectNamePlaceholder")}
          ref={titleInputRef}
          type="text"
          size={60}
          maxLength={100}
          onChange={handleTitleChange}
        />
      </div>
    </FlowStep>
  );
}

export default NewEmptyScript;
