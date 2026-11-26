import { Route } from 'react-router-dom';
import DiscountsPage from './DiscountsPage';
import { ReviewPage } from './ReviewPage';
import { CalendarPage } from './CalendarPage';
import { BookmarksPage } from './BookmarksPage';
import {
  BusinessDirectory,
  RegisterBusinessPage,
} from '../business/BusinessDirectory';
import { BusinessDetail } from '../business/BusinessDetail';
export const discountsRoutes = (
  <>
    <Route path="/discounts/review" element={<ReviewPage />} />
    <Route path="/discounts/calendar" element={<CalendarPage />} />
    <Route path="/discounts/saved" element={<BookmarksPage />} />
    <Route path="/discounts/business" element={<BusinessDirectory />} />
    <Route path="/discounts/business/new" element={<RegisterBusinessPage />} />
    <Route
      path="/discounts/business/:businessId"
      element={<BusinessDetail />}
    />
    <Route path="/discounts/*" element={<DiscountsPage />} />
  </>
);
