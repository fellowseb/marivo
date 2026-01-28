import { NavLink } from 'react-router';
import Button from '../../components/button.component';
import { HeaderBreadcrumbs } from '../../layouts/header.component';
import FlowStep from '../../components/flow-step.component';

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
  return (
    <FlowStep
      title="Pick from our scripts collection"
      Actions={
        <>
          <Button icon="next" iconSide="right">
            Next
          </Button>
        </>
      }
    >
      - By name
      <br />
      - By author
      <br />
      - By language: French, English, Spanish, German
      <br />
      - By number of comedians (any, male, female)
      <br />
      - By genre
      <br />
      - By century / period
      <br />
    </FlowStep>
  );
}

export default FromCollection;
