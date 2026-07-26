import { NavLink, useNavigate } from 'react-router';
import Button from '../../components/button.component';
import { HeaderBreadcrumbs } from '../../layouts/header.component';
import FlowStep from '../../components/flow-step.component';
import CollapsibleSection from '../../components/collapsible-section.component';
import styles from './from-collection.module.css';
import { CollectionItem } from './collection-item.component';
import { CardsSelect } from '../../components/cards-select.component';
import { useCollectionMetadataContext } from './collection-metadata.context';

export function FromCollectionBreadcrumbs() {
  return (
    <HeaderBreadcrumbs
      key="new-empty-script"
      crumbs={[
        <NavLink
          to={{
            pathname: '/plays/new',
          }}
        >
          New play
        </NavLink>,
        <NavLink
          to={{
            pathname: '/plays/new/from-collection',
          }}
        >
          From collection
        </NavLink>,
      ]}
    />
  );
}

function FromCollection() {
  const { genres, periods } = useCollectionMetadataContext();
  const collectionItems = [
    {
      scriptTitle: "Le Jeu de l'Amour et du Hasard",
      scriptAuthor: 'P. de Marivaux',
    },
  ];
  const navigate = useNavigate();
  const handlePrevious = () => {
    navigate('/plays/new');
  };
  return (
    <FlowStep
      title="Pick from our scripts collection"
      Actions={
        <>
          <Button icon="previous" onClick={handlePrevious} />
          <Button disabled rightIcon="next">
            Next
          </Button>
        </>
      }
    >
      <div className={styles.container}>
        <div className={styles.filters}>
          <div>
            <strong>Filter by</strong>
          </div>
          <CollapsibleSection Header="▶ Title" collapsed={false}>
            <input type="text" />
          </CollapsibleSection>
          <CollapsibleSection Header="▶ Author" collapsed={false}>
            <input type="text" />
          </CollapsibleSection>
          <CollapsibleSection Header="▶ Language" collapsed={false}>
            <CardsSelect
              multiple={true}
              options={[
                {
                  label: 'FR',
                  value: 'fr',
                },
                {
                  label: 'EN',
                  value: 'en',
                },
              ]}
            />
          </CollapsibleSection>
          <CollapsibleSection Header="▶ Number of roles" collapsed={false}>
            <CardsSelect
              multiple={true}
              options={[
                {
                  label: '1',
                  value: '1',
                },
                {
                  label: '2',
                  value: '2',
                },
                {
                  label: '3',
                  value: '3',
                },
                {
                  label: '4',
                  value: '4',
                },
                {
                  label: '5',
                  value: '5',
                },
                {
                  label: '6',
                  value: '6',
                },
                {
                  label: '7',
                  value: '7',
                },
                {
                  label: '8',
                  value: '8',
                },
                {
                  label: '9',
                  value: '9',
                },
                {
                  label: '10+',
                  value: '10+',
                },
              ]}
            />
          </CollapsibleSection>
          <CollapsibleSection
            Header="▶ Number of male roles"
            collapsed={false}
          >
            <CardsSelect
              multiple={true}
              options={[
                {
                  label: '1',
                  value: '1',
                },
                {
                  label: '2',
                  value: '2',
                },
                {
                  label: '3',
                  value: '3',
                },
                {
                  label: '4',
                  value: '4',
                },
                {
                  label: '5',
                  value: '5',
                },
                {
                  label: '6',
                  value: '6',
                },
                {
                  label: '7',
                  value: '7',
                },
                {
                  label: '8',
                  value: '8',
                },
                {
                  label: '9',
                  value: '9',
                },
                {
                  label: '10+',
                  value: '10+',
                },
              ]}
            />
          </CollapsibleSection>
          <CollapsibleSection
            Header="▶ Number of female roles"
            collapsed={false}
          >
            <CardsSelect
              multiple={true}
              options={[
                {
                  label: '1',
                  value: '1',
                },
                {
                  label: '2',
                  value: '2',
                },
                {
                  label: '3',
                  value: '3',
                },
                {
                  label: '4',
                  value: '4',
                },
                {
                  label: '5',
                  value: '5',
                },
                {
                  label: '6',
                  value: '6',
                },
                {
                  label: '7',
                  value: '7',
                },
                {
                  label: '8',
                  value: '8',
                },
                {
                  label: '9',
                  value: '9',
                },
                {
                  label: '10+',
                  value: '10+',
                },
              ]}
            />
          </CollapsibleSection>
          <CollapsibleSection Header="▶ Genre" collapsed={false}>
            <CardsSelect
              multiple={true}
              options={genres.map((genre) => ({
                label: genre,
                value: genre,
              }))}
            />
          </CollapsibleSection>
          <CollapsibleSection Header="▶ Period" collapsed={false}>
            <CardsSelect
              multiple={true}
              options={periods.map((period) => ({
                label: period,
                value: period,
              }))}
            />
          </CollapsibleSection>
        </div>
        <div className={styles.separator} />
        <div className={styles.results}>
          {collectionItems.map((item) => (
            <CollectionItem
              scriptTitle={item.scriptTitle}
              scriptAuthor={item.scriptAuthor}
            />
          ))}
        </div>
      </div>
    </FlowStep>
  );
}

export default FromCollection;
