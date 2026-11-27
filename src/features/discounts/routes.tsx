import { Route } from 'react-router-dom';
import DiscountsPage from './DiscountsPage';
import { ReviewPage } from './ReviewPage';
import { CalendarPage } from './CalendarPage';
import { BookmarksPage } from './BookmarksPage';
import {
  BusinessDirectory,
  RegisterBusinessPage,
} from '../business/BusinessDirectory';
import { DiscountMapPage } from '../business/DiscountMapPage';
import { BusinessDetail } from '../business/BusinessDetail';
import { FollowedBusinessesPage } from '../business/FollowedBusinessesPage';
import { BusinessAlertsPage } from '../notifications/BusinessAlertsPage';
export const discountsRoutes = (
  <>
    <Route path="/discounts/map" element={<DiscountMapPage />} />
    <Route path="/discounts/review" element={<ReviewPage />} />
    <Route path="/discounts/calendar" element={<CalendarPage />} />
    <Route path="/discounts/saved" element={<BookmarksPage />} />
    <Route path="/discounts/business" element={<BusinessDirectory />} />
    <Route path="/discounts/business/new" element={<RegisterBusinessPage />} />
    <Route
      path="/discounts/business/following"
      element={<FollowedBusinessesPage />}
    />
    <Route
      path="/discounts/business/:businessId"
      element={<BusinessDetail />}
    />
    <Route path="/discounts/notifications" element={<BusinessAlertsPage />} />
    <Route path="/discounts/*" element={<DiscountsPage />} />
  </>
);
