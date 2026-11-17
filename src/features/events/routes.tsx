import { Route } from 'react-router-dom';
import EventsPage from './EventsPage';
export const eventsRoutes = <Route path="/events/*" element={<EventsPage />} />;
