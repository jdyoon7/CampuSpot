import { Route } from 'react-router-dom';
import DiscountsPage from './DiscountsPage';
import { ReviewPage } from './ReviewPage';
export const discountsRoutes = (
  <>
    <Route path="/discounts/review" element={<ReviewPage />} />
    <Route path="/discounts/*" element={<DiscountsPage />} />
  </>
);
