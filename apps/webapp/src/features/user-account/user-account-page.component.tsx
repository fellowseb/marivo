import { NavLink } from "react-router";
import styles from "./user-account-page.module.css";
import { HeaderBreadcrumbs } from "../../layouts/header.component";
import { UserProfile } from "@clerk/react-router";

export function UserAccountPageBreadcrumbs() {
  return (
    <HeaderBreadcrumbs
      key="my-account"
      crumbs={[
        <NavLink
          to={{
            pathname: "/my-account",
          }}
        >
          My account
        </NavLink>,
      ]}
    />
  );
}

export function UserAccountPage() {
  return (
    <div className={styles.container}>
      <UserProfile
        routing="virtual"
        appearance={{
          theme: "simple",
          variables: {
            colorBackground: "var(--color-cream-deep)",
          },
        }}
      />
    </div>
  );
}

export default UserAccountPage;
