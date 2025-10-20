import styles from './unexpected-error.module.css';

interface UnexpectedErrorProps {
  error?: string;
}

function UnexpectedError(props: UnexpectedErrorProps) {
  return (
    <div className={styles.container}>
      <div className={styles.icon}></div>
      <p className={styles.message}>
        An unexpected error prevented us from loading this section correctly.
        Sorry for that !
        <br />
        Try refreshing the page in a bit or contacting us if unsuccesful.
        {props.error ? (
          <>
            <br /> ({props.error})
          </>
        ) : null}
      </p>
    </div>
  );
}

export default UnexpectedError;
