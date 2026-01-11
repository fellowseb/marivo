import classNames from 'classnames';
import { type PropsWithChildren, type ReactNode, useState } from 'react';
import styles from './collapsible-section.module.css';
import Button from './button.component';

interface CollapsibleSectionProps {
  Header: ReactNode;
  HeaderExpanded?: ReactNode;
}

function CollapsibleSection(props: PropsWithChildren<CollapsibleSectionProps>) {
  const [collapsed, setCollapsed] = useState(true);
  const handleClickHeader = () => {
    setCollapsed((prev) => !prev);
  };
  return (
    <div className={styles.container}>
      <Button onClick={handleClickHeader} variant="discrete">
        {collapsed ? props.Header : (props.HeaderExpanded ?? props.Header)}
      </Button>
      <div
        className={classNames({
          [styles.hidden]: collapsed,
        })}
      >
        {props.children}
      </div>
    </div>
  );
}

export default CollapsibleSection;
