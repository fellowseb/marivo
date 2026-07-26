import Button from '../../components/button.component';
import Panel from '../../components/panel.component';
import styles from './script-characters-panel.module.css';

interface ScriptCharactersPanelProps {
  characters: { [id: string]: string };
  onClose?: () => void;
}

function ScriptCharactersPanel(props: ScriptCharactersPanelProps) {
  return (
    <Panel title="Characters" icon="characterLine" onClose={props.onClose}>
      <div className={styles.content}>
        <ul className={styles.charactersContainer}>
          {Object.keys(props.characters).map((characterId) => {
            return (
              <li>
                <Button variant="discrete">
                  {props.characters[characterId]}
                </Button>
              </li>
            );
          })}
        </ul>
      </div>
    </Panel>
  );
}

export default ScriptCharactersPanel;
