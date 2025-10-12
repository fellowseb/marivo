import { useState, type ReactElement, type ReactNode } from 'react';
import styles from './tabs.module.css';
import classNames from 'classnames';

interface TabProps {
  name: string | ReactElement;
  isActive: boolean;
  onClick?: () => void;
}

function Tab(props: TabProps) {
  const handleClick = () => {
    props.onClick?.();
  };
  return (
    <div
      className={classNames({
        [styles.tab]: true,
        [styles.active]: props.isActive,
        [styles.inactive]: !props.isActive,
      })}
      onClick={handleClick}
    >
      {props.name}
    </div>
  );
}

interface TabsProps {
  tabs: {
    name: string | ReactElement;
    ContentComponent: ReactNode;
  }[];
  containerClass?: string;
  onTabChange?: (tabIndex: number) => void;
  activeTab?: number;
}

function Tabs(props: TabsProps) {
  const [activeTab, setActiveTab] = useState(props.activeTab ?? 0);
  const handleTabClick = (tabIndex: number) => () => {
    setActiveTab(tabIndex);
    props.onTabChange?.(tabIndex);
  };
  return (
    <div
      className={classNames([
        styles.container,
        ...(props.containerClass ? [props.containerClass] : []),
      ])}
    >
      <div className={styles.tabsContainer}>
        {props.tabs.map((tab, tabIndex) => {
          return (
            <Tab
              name={tab.name}
              isActive={tabIndex === activeTab}
              onClick={handleTabClick(tabIndex)}
              key={tabIndex}
            />
          );
        })}
      </div>
      <div className={styles.contentContainer}>
        {props.tabs[activeTab].ContentComponent}
      </div>
    </div>
  );
}

export default Tabs;
