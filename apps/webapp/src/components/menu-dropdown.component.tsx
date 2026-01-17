import type { FocusEventHandler, PropsWithChildren, RefObject } from 'react';
import styles from './menu-dropdown.module.css';

interface MenuDropdownProps {
  positionAnchorName: string;
  ref?: RefObject<HTMLDialogElement | null>;
  onBlur?: () => void;
}

function MenuDropdown(props: PropsWithChildren<MenuDropdownProps>) {
  const handleMenuOutsideClick: FocusEventHandler = (event) => {
    if (
      props.ref &&
      (!props.ref.current || !props.ref.current.contains(event.relatedTarget))
    ) {
      props.onBlur?.();
    }
  };
  return (
    <dialog
      ref={props.ref}
      className={styles.menu}
      style={{
        positionAnchor: props.positionAnchorName,
      }}
      open={true}
      onBlur={handleMenuOutsideClick}
    >
      {props.children}
    </dialog>
  );
}

export default MenuDropdown;
