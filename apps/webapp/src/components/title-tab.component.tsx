import styles from "./title-tab.module.css";

/** Breadcrumb "tab" with a book icon, used for the current script/play title. */
export function TitleTab(props: { title: string }) {
  return (
    <div className={styles.tab}>
      <div className={styles.icon}></div>
      {props.title}
    </div>
  );
}
