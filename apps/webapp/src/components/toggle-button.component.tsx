import { useRef, useState, type KeyboardEventHandler } from 'react';
import styles from './toggle-button.module.css';

interface ToggleButtonProps {
  onToggle: (value: boolean) => void;
  label: string;
  value: boolean;
}

export function ToggleButton(props: ToggleButtonProps) {
  const [toggled, setToggled] = useState(props.value);
  const checkboxRef = useRef<HTMLInputElement>(null);
  const handleChange = () => {
    if (checkboxRef.current) {
      setToggled((prevValue) => !prevValue);
      props.onToggle(!toggled);
    }
  };
  const handleKeyDown: KeyboardEventHandler = (event) => {
    if (event.code === 'Space') {
      event.preventDefault();
    }
  };
  const handleKeyUp: KeyboardEventHandler = (event) => {
    if (event.code === 'Space' && checkboxRef.current) {
      event.preventDefault();
      setToggled((prevValue) => !prevValue);
      props.onToggle(!toggled);
    }
  };
  return (
    <label
      className={styles.switch}
      tabIndex={0}
      onKeyUp={handleKeyUp}
      onKeyDown={handleKeyDown}
    >
      <input
        type="checkbox"
        onChange={handleChange}
        ref={checkboxRef}
        checked={toggled}
      />
      <span className={styles.slider}></span>
      {props.label}
    </label>
  );
}
