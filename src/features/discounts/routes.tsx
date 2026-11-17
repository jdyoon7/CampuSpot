import { Route } from 'react-router-dom';
import DiscountsPage from './DiscountsPage';
export const discountsRoutes = (
  <Route path="/discounts/*" element={<DiscountsPage />} />
);
