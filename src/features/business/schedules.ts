export const weekdays = ['월', '화', '수', '목', '금', '토', '일'];
export function formatSchedule(schedule: {
  starts_on: string | null;
  ends_on: string | null;
  weekdays: number[] | null;
  available_from: string | null;
  available_until: string | null;
}) {
  const dates =
    schedule.starts_on && schedule.ends_on
      ? schedule.starts_on + ' ~ ' + schedule.ends_on
      : '상시';
  const days =
    schedule.weekdays?.map((day) => weekdays[day - 1]).join('·') ?? '매일';
  const time =
    schedule.available_from && schedule.available_until
      ? schedule.available_from.slice(0, 5) +
        '–' +
        schedule.available_until.slice(0, 5)
      : '시간 제한 없음';
  return [dates, days, time].join(' · ');
}
