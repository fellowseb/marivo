import { useTranslation } from "react-i18next";
import { LANGUAGE_VALUES, type LanguageValue } from "@marivo/utils";
import { useLanguage } from "./language.context.tsx";
import styles from "./language-switcher.module.css";

const LANGUAGE_LABEL_KEYS: Record<LanguageValue, string> = {
  auto: "account:language.options.auto",
  en: "account:language.options.en",
  fr: "account:language.options.fr",
};

export function LanguageSwitcher() {
  const { t } = useTranslation();
  const { preference, setPreference } = useLanguage();

  return (
    <div className={styles.container}>
      <div className={styles.languages} role="radiogroup" aria-label={t("account:language.label")}>
        {LANGUAGE_VALUES.map((value) => {
          const isSelected = value === preference;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              className={`${styles.languageButton} ${isSelected ? styles.languageButtonSelected : ""}`}
              onClick={() => setPreference(value)}
            >
              {t(LANGUAGE_LABEL_KEYS[value])}
            </button>
          );
        })}
      </div>
      <p className={styles.hint}>{t("account:language.hint")}</p>
    </div>
  );
}

export default LanguageSwitcher;
