import { NavLink } from "react-router";
import { useTranslation } from "react-i18next";
import styles from "./user-account-page.module.css";
import { HeaderBreadcrumbs } from "../../layouts/header.component";
import { UserProfile } from "@clerk/react-router";
import ThemeSwitcher from "../theme/theme-switcher.component";
import LanguageSwitcher from "../language/language-switcher.component";
import Icon from "../../components/icon.component";

export function UserAccountPageBreadcrumbs() {
  const { t } = useTranslation("account");
  return (
    <HeaderBreadcrumbs
      key="my-account"
      crumbs={[
        <NavLink
          to={{
            pathname: "/my-account",
          }}
        >
          {t("breadcrumb")}
        </NavLink>,
      ]}
    />
  );
}

export function UserAccountPage() {
  const { t } = useTranslation("account");
  return (
    <div className={styles.container}>
      <UserProfile
        routing="virtual"
        appearance={{
          theme: "simple",
          variables: {
            colorBackground: "var(--color-surface-deep)",
          },
        }}
      >
        <UserProfile.Page
          label={t("themePage")}
          url="theme"
          labelIcon={<Icon value="settings" size="small" mode="primary" />}
        >
          <ThemeSwitcher />
        </UserProfile.Page>
        <UserProfile.Page
          label={t("languagePage")}
          url="language"
          labelIcon={<Icon value="settings" size="small" mode="primary" />}
        >
          <LanguageSwitcher />
        </UserProfile.Page>
      </UserProfile>
    </div>
  );
}

export default UserAccountPage;
