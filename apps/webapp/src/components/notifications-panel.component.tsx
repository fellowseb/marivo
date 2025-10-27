import Icon from './icon.component';
import Button from './button.components';
import { useNotificationsDisplay } from './notifications.context.tsx';
import styles from './notifications-panel.module.css';
import classNames from 'classnames';

export function NotificationsPanel() {
  const { notifications, hideNotification } = useNotificationsDisplay();
  const handleHide = (id: string) => hideNotification(id);
  return (
    <div className={styles.container}>
      {notifications.map(({ id, message, type, icon }) => {
        return (
          <div
            className={classNames({
              [styles.notification]: true,
              [styles.error]: type === 'error',
              [styles.info]: type === 'info',
            })}
          >
            <Icon
              value={icon ?? (type === 'error' ? 'error' : 'notification')}
              size="large"
              mode="primary"
              customClassNames={[styles.icon]}
            />
            <span>{message}</span>
            <div className={styles.actions}>
              <Button icon="clear" onClick={() => handleHide(id)}>
                Hide
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
