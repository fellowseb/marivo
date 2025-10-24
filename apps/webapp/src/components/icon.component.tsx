import classNames from 'classnames';
import styles from './icon.module.css';
import iconsStyles from './icons.module.css';

const ICON_CLASSES = {
  accept: iconsStyles.accept,
  animatedWaiting: iconsStyles.animatedWaiting,
  archive: iconsStyles.archive,
  asc: iconsStyles.asc,
  blocking: iconsStyles.blocking,
  clear: iconsStyles.clear,
  decline: iconsStyles.decline,
  delete: iconsStyles.delete,
  desc: iconsStyles.desc,
  downloadCloud: iconsStyles.downloadCloud,
  hardDrive: iconsStyles.hardDrive,
  help: iconsStyles.help,
  memorize: iconsStyles.memorize,
  new: iconsStyles.new,
  notification: iconsStyles.notification,
  planning: iconsStyles.planning,
  previous: iconsStyles.previous,
  redo: iconsStyles.redo,
  script: iconsStyles.script,
  search: iconsStyles.search,
  settings: iconsStyles.settings,
  signout: iconsStyles.signout,
  staging: iconsStyles.staging,
  undo: iconsStyles.undo,
  user: iconsStyles.user,
  voiceRecording: iconsStyles.voiceRecording,
  web: iconsStyles.web,
};

export type IconValue = keyof typeof ICON_CLASSES;

export type IconSize = 'small' | 'medium';

export type IconColorMode = 'primary' | 'secondary';

export interface IconProps {
  value: IconValue;
  size: IconSize;
  mode: IconColorMode;
  customClassNames?: string[];
}

function Icon(props: IconProps) {
  return (
    <div
      className={classNames({
        [styles.icon]: true,
        [styles.sizeSmall]: props.size === 'small',
        [styles.sizeMedium]: props.size === 'medium',
        [styles.primary]: props.mode === 'primary',
        [styles.secondary]: props.mode === 'secondary',
        [ICON_CLASSES[props.value]]: true,
        ...(props.customClassNames ?? []).reduce(
          (acc, curr) => ({
            ...acc,
            [curr]: true,
          }),
          {},
        ),
      })}
    />
  );
}

export default Icon;
