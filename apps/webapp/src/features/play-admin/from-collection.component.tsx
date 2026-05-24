import { NavLink } from 'react-router';
import Button from '../../components/button.component';
import { HeaderBreadcrumbs } from '../../layouts/header.component';
import FlowStep from '../../components/flow-step.component';
import CollapsibleSection from '../../components/collapsible-section.component';

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
        <Button disabled rightIcon="next">
          Next
        </Button>
      }
    >
      <div>
        <strong>Filter by</strong>
      </div>
      <CollapsibleSection Header="Title">
        <input type="text" />
      </CollapsibleSection>
      <CollapsibleSection Header="Author">
        <input type="text" />
      </CollapsibleSection>
      <CollapsibleSection Header="Language">
        <select>
          <option>French</option>
          <option>English</option>
        </select>
      </CollapsibleSection>
      <CollapsibleSection Header="Number of comedians">
        <select multiple>
          <option>1</option>
          <option>2</option>
          <option>3</option>
          <option>4</option>
          <option>5</option>
          <option>6</option>
          <option>7</option>
          <option>8</option>
        </select>
      </CollapsibleSection>
      <CollapsibleSection Header="Genre">
        <select multiple>
          <option>Comedy / Vaudeville</option>
          <option>Contemporain</option>
        </select>
      </CollapsibleSection>
      <CollapsibleSection Header="Period"></CollapsibleSection>
    </FlowStep>
  );
}

export default FromCollection;
