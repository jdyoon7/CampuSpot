import { Route } from 'react-router-dom';
import DiscountsPage from './DiscountsPage';
import { ReviewPage } from './ReviewPage';
import { CalendarPage } from './CalendarPage';
export const discountsRoutes = (
  <>
    <Route path="/discounts/review" element={<ReviewPage />} />
    <Route path="/discounts/calendar" element={<CalendarPage />} />
    <Route path="/discounts/*" element={<DiscountsPage />} />
  </>
);
