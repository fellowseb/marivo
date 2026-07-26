import type { IconValue } from './icon.component';
import styles from './cards-select.module.css';
import Button from './button.component';
import { useState } from 'react';

interface CardsSelectOption {
  label: string;
  value: string;
  icon?: IconValue;
}

interface CardsSelectProps {
  options: CardsSelectOption[];
  multiple?: boolean;
  value?: string | string[];
}

export function CardsSelect(props: CardsSelectProps) {
  const [selection, setSelection] = useState<Set<string>>(
    new Set(
      props.value
        ? Array.isArray(props.value)
          ? props.value
          : [props.value]
        : null,
    ),
  );
  const handleSelect = (value: string) => () => {
    setSelection((prev) => {
      const newSet = new Set(props?.multiple ? prev.values() : []);
      if (prev.has(value)) {
        newSet.delete(value);
      } else {
        newSet.add(value);
      }
      return newSet;
    });
  };
  return (
    <div className={styles.select}>
      {props.options.map((option) => (
        <Button
          key={option.value}
          customClassNames={
            selection.has(option.value)
              ? [styles.option, styles.optionSelected]
              : [styles.option, styles.optionNotSelected]
          }
          onClick={handleSelect(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
