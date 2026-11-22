import type { CampusEvent } from '../../../src/features/events/types';

export const campusEvents: CampusEvent[] = [
  {
    id: 'event-hanbit-festival',
    title: '한빛 캠퍼스 가을 축제',
    campusId: 'campus-hanbit',
    campusName: '한빛대학교',
    region: '서울 성북구',
    organizerId: 'organizer-student-council',
    startsAt: '2026-11-20T10:00:00+09:00',
    endsAt: '2026-11-20T21:00:00+09:00',
    location: { name: '대운동장', address: '서울 성북구 한빛로 1' },
    category: 'festival',
    description:
      '학생 공연과 푸드 부스가 함께하는 교내 축제입니다. 일부 프로그램은 현장 상황에 따라 달라질 수 있습니다.',
    posterLabel: '가을 축제 · 함께 즐기는 캠퍼스',
    applicationMethod:
      '공연 관람은 별도 신청 없이 입장할 수 있습니다. 부스 참여는 학생회 공지의 신청 링크를 확인하세요.',
    participationConditions: [
      '재학생 및 교직원 누구나 관람 가능',
      '부스 참여는 주최 측의 별도 확인이 필요합니다.',
    ],
    contact: '학생회 인스타그램 @hanbit_student',
  },
  {
    id: 'event-hanbit-night-market',
    title: '동아리 연합 야간 마켓',
    campusId: 'campus-hanbit',
    campusName: '한빛대학교',
    region: '서울 성북구',
    organizerId: 'organizer-club-union',
    startsAt: '2026-11-21T19:00:00+09:00',
    endsAt: '2026-11-22T00:30:00+09:00',
    location: {
      name: '학생회관 앞 광장',
      address: '서울 성북구 한빛로 1 학생회관',
    },
    category: 'club',
    description:
      '교내 동아리들이 직접 만든 소품과 간식을 소개하는 야간 마켓입니다.',
    posterLabel: '동아리 연합 야간 마켓',
    applicationMethod:
      '방문 참여는 자유입니다. 판매 부스 신청은 동아리연합회에 문의하세요.',
    participationConditions: [
      '교내 구성원과 방문객 참여 가능',
      '미성년자는 보호자와 함께 방문해 주세요.',
    ],
    contact: '동아리연합회 club.union@hanbit.ac.kr',
  },
  {
    id: 'event-seojeong-career',
    title: '서정대 진로 토크 콘서트',
    campusId: 'campus-seojeong',
    campusName: '서정대학교',
    region: '경기 수원시',
    organizerId: 'organizer-career-center',
    startsAt: '2026-11-25T14:00:00+09:00',
    endsAt: '2026-11-25T16:00:00+09:00',
    location: { name: '미래관 2층 대강당', address: '경기 수원시 서정로 20' },
    category: 'other',
    description: '졸업생 선배들과 전공별 진로 이야기를 나누는 행사입니다.',
    posterLabel: '선배와 함께하는 진로 이야기',
    applicationMethod:
      '학생지원 포털에서 사전 신청하세요. 신청 완료 여부는 포털에서 확인해야 합니다.',
    participationConditions: [
      '서정대학교 재학생 대상',
      '좌석이 한정되어 주최 측 확인이 필요합니다.',
    ],
    contact: '진로개발센터 031-555-0102',
  },
  {
    id: 'event-open-mic',
    title: '캠퍼스 오픈 마이크',
    campusId: 'campus-hanbit',
    campusName: '한빛대학교',
    region: '서울 성북구',
    organizerId: 'organizer-live-club',
    startsAt: '2026-11-28T23:30:00+09:00',
    endsAt: '2026-11-29T01:00:00+09:00',
    location: {
      name: '학생회관 소극장',
      address: '서울 성북구 한빛로 1 학생회관 지하 1층',
    },
    category: 'club',
    description: '노래와 낭독을 나누는 작은 심야 무대입니다.',
    posterLabel: '밤을 여는 오픈 마이크',
    applicationMethod:
      '관객은 온라인 예약 후 입장하세요. 무대 신청은 행사 전날 마감됩니다.',
    participationConditions: [
      '관객은 누구나 신청 가능',
      '무대 참여는 주최 동아리의 사전 안내를 따릅니다.',
    ],
    contact: '라이브클럽 @hanbit_live',
  },
];
