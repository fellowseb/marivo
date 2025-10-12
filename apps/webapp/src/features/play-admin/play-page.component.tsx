import { Navigate, Route, Routes } from 'react-router';
import PageNotFound from '../../components/page-not-found.component';
import ScriptTab from '../script-edition/script-tab.component';
import MemorizeTab from '../lines-memorization/memorize-tab.component';
import PlaySettingsTab from '../play-settings/play-settings-tab.component';
import PlanningTab from '../planning/planning-tab.component';
import BlockingTab from '../blocking/blocking-tab.component';
import StagingDirectionsTab from '../staging-directions/staging-directions-tab.component';

export function PlayTitle() {
  return 'The Mousetrap';
}

function PlayPage() {
  return (
    <Routes>
      <Route path="script" element={<ScriptTab />} />
      <Route path="staging-directions" element={<StagingDirectionsTab />} />
      <Route path="blocking" element={<BlockingTab />} />
      <Route path="memorize" element={<MemorizeTab />} />
      <Route path="planning" element={<PlanningTab />} />
      <Route path="settings" element={<PlaySettingsTab />} />
      <Route index path="/" element={<Navigate to="script" />} />
      <Route index path="*" element={<PageNotFound />} />
    </Routes>
  );
}

export default PlayPage;
