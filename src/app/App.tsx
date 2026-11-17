import { NavLink, Route, Routes } from 'react-router-dom';
import {
  House,
  Users,
  CalendarDays,
  BadgePercent,
  UserRound,
} from 'lucide-react';
import { groupsRoutes } from '../features/groups/routes';
import { eventsRoutes } from '../features/events/routes';
import { discountsRoutes } from '../features/discounts/routes';
import { ModuleStatus } from '../shared/components/ModuleStatus';
export function App() {
  return (
    <>
      <nav aria-label="주 메뉴">
        <NavLink to="/" end>
          <House size={20} />홈
        </NavLink>
        <NavLink to="/groups">
          <Users size={20} />
          모임
        </NavLink>
        <NavLink to="/events">
          <CalendarDays size={20} />
          행사·장소
        </NavLink>
        <NavLink to="/discounts">
          <BadgePercent size={20} />
          할인·혜택
        </NavLink>
        <NavLink to="/me">
          <UserRound size={20} />
          마이페이지
        </NavLink>
      </nav>
      <main>
        <Routes>
          <Route
            path="/"
            element={
              <ModuleStatus
                title="CampuSpot"
                description="대학생 여가·교류 통합 플랫폼 · 세 명이 함께 만드는 개발 시작 화면"
              />
            }
          />
          {groupsRoutes}
          {eventsRoutes}
          {discountsRoutes}
          <Route
            path="/me"
            element={
              <ModuleStatus
                title="마이페이지"
                description="인증과 프로필은 공통 기반 단계에서 연결합니다."
              />
            }
          />
          <Route path="*" element={<h1>페이지를 찾을 수 없습니다.</h1>} />
        </Routes>
      </main>
    </>
  );
}
