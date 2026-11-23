import { useEffect, useState } from 'react';
import { ActionForm } from './ActionForm';
import { SchoolSelect } from './SchoolSelect';
import { type AuthState, useAuth } from '../../shared/auth/useAuth';
import {
  AccountError,
  client,
  accountAction,
  saveProfile,
  confirmMailbox,
} from '../../shared/auth/account';
const roleLabels = {
  member: '일반 회원',
  verified_student: '인증 대학생',
  event_organizer: '행사 주최자',
  business_owner: '매장 운영자',
  admin: '관리자',
  super_admin: '최고 관리자',
};
function Avatar({ userId }: { userId: string }) {
  const [version, setVersion] = useState(0),
    [url, setUrl] = useState(''),
    [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true,
      objectUrl = '';
    async function load() {
      const bucket = client().storage.from('core-avatars');
      const { data, error } = await bucket.list(userId, {
        search: 'avatar.png',
        limit: 1,
      });
      if (error) throw error;
      if (!data.length) return;
      const image = await bucket.download(userId + '/avatar.png');
      if (image.error) throw image.error;
      if (active) {
        objectUrl = URL.createObjectURL(image.data);
        setUrl(objectUrl);
      }
    }
    setUrl('');
    setFailed(false);
    load().catch(() => {
      if (active) setFailed(true);
    });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [userId, version]);
  return (
    <section>
      <h2>내 프로필 사진</h2>
      {url && <img width="96" height="96" src={url} alt="내 프로필 사진" />}
      {failed && (
        <button onClick={() => setVersion((v) => v + 1)}>
          사진 다시 불러오기
        </button>
      )}
      <ActionForm
        label="사진 저장"
        submit={async (data) => {
          const file = data.get('avatar');
          if (
            !(file instanceof File) ||
            file.type !== 'image/png' ||
            file.size > 2097152
          )
            throw new AccountError('image', '2MB 이하 PNG 사진을 선택하세요.');
          await accountAction(file);
          setVersion((v) => v + 1);
        }}
      >
        <label>
          PNG 사진 (최대 1024×1024, 2MB)
          <input type="file" accept="image/png" name="avatar" required />
        </label>
      </ActionForm>
    </section>
  );
}
export function MemberPanel({
  state,
}: {
  state: Extract<AuthState, { status: 'ready' }>;
}) {
  const { refresh } = useAuth(),
    { profile, roles, verifiedUniversityId } = state.account;
  const [university, setUniversity] = useState(profile.university_id),
    [campus, setCampus] = useState(profile.campus_id),
    [department, setDepartment] = useState(profile.department_id);
  return (
    <>
      <section>
        <h2>{profile.nickname}</h2>
        <p>{state.user.email}</p>
        <p>{roles.map((r) => roleLabels[r]).join(' · ')}</p>
        <ActionForm
          label="로그아웃"
          submit={async () => {
            const { error } = await client().auth.signOut({ scope: 'local' });
            if (error) throw error;
          }}
        />
      </section>
      <section>
        <h2>프로필 수정</h2>
        <ActionForm
          label="프로필 저장"
          submit={async (data) => {
            await saveProfile({
              nickname: String(data.get('nickname')),
              student_number: String(data.get('student_number')).trim() || null,
              university_id: university,
              campus_id: campus,
              department_id: department,
            });
            refresh();
          }}
        >
          <label>
            닉네임
            <input
              name="nickname"
              minLength={2}
              maxLength={24}
              required
              defaultValue={profile.nickname}
            />
          </label>
          <SchoolSelect
            label="학교"
            table="universities"
            value={university}
            onChange={(id) => {
              setUniversity(id);
              setCampus(null);
              setDepartment(null);
            }}
          />
          <SchoolSelect
            label="캠퍼스"
            table="campuses"
            value={campus}
            parent={university}
            onChange={(id) => {
              setCampus(id);
              setDepartment(null);
            }}
          />
          <SchoolSelect
            label="학과"
            table="departments"
            value={department}
            parent={campus}
            onChange={setDepartment}
          />
          <label>
            학번 (나만 보기)
            <input
              name="student_number"
              defaultValue={profile.student_number ?? ''}
              maxLength={24}
            />
          </label>
        </ActionForm>
      </section>
      <Avatar userId={state.user.id} />
      <section>
        <h2>학교 이메일 인증</h2>
        <p>
          {verifiedUniversityId
            ? '학교 이메일 인증 완료'
            : '아직 인증하지 않았습니다.'}
        </p>
        <ActionForm
          label="인증 메일 받기"
          submit={async (data) => {
            await accountAction({
              action: 'school-email',
              email: String(data.get('email')),
            });
            return '학교 메일함을 확인하세요. 코드는 10분간 유효합니다.';
          }}
        >
          <label>
            학교 이메일
            <input name="email" type="email" required />
          </label>
        </ActionForm>
        <ActionForm
          label="코드 확인"
          submit={async (data) => {
            await confirmMailbox(String(data.get('code')));
            refresh();
          }}
        >
          <label>
            메일로 받은 인증코드
            <input name="code" autoComplete="one-time-code" required />
          </label>
        </ActionForm>
      </section>
      <details>
        <summary>회원 탈퇴</summary>
        <p>계정, 프로필 사진과 학교 인증 기록이 삭제됩니다.</p>
        <ActionForm
          label="계정 영구 삭제"
          submit={async (data) => {
            await accountAction({
              action: 'delete',
              password: String(data.get('password')),
            });
            await client().auth.signOut({ scope: 'local' });
            location.replace('/me');
          }}
        >
          <label>
            현재 비밀번호
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              required
            />
          </label>
          <label>
            <input type="checkbox" required />
            계정 삭제에 동의합니다.
          </label>
        </ActionForm>
      </details>
    </>
  );
}
