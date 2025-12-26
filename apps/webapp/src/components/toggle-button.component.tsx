import { useRef } from 'react';
import styles from './toggle-button.module.css';

interface ToggleButtonProps {
  onToggle: (value: boolean) => void;
  label: string;
  value: boolean;
}

export function ToggleButton(props: ToggleButtonProps) {
  const checkboxRef = useRef<HTMLInputElement>(null);
  const handleChange = () => {
    if (checkboxRef.current) {
      props.onToggle(checkboxRef.current.checked);
    }
  };
  return (
    <label className={styles.switch}>
      <input
        type="checkbox"
        onChange={handleChange}
        ref={checkboxRef}
        checked={props.value}
      />
      <span className={styles.slider}></span>
      {props.label}
    </label>
  );
}
