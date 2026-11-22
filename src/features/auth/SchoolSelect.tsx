import { useEffect, useState } from 'react';
import { client } from '../../shared/auth/account';
type Option = { id: string; name: string };
export function SchoolSelect({
  label,
  table,
  parent,
  value,
  onChange,
}: {
  label: string;
  table: 'universities' | 'campuses' | 'departments';
  parent?: string | null;
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  const [items, setItems] = useState<Option[]>([]),
    [error, setError] = useState(false),
    [busy, setBusy] = useState(false),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setItems([]);
    setError(false);
    if (parent === null) {
      setBusy(false);
      return;
    }
    setBusy(true);
    async function load() {
      const rows: Option[] = [];
      for (let start = 0; active; start += 100) {
        const db = client();
        const query =
          table === 'universities'
            ? db.from('universities').select('id,name')
            : table === 'campuses'
              ? db
                  .from('campuses')
                  .select('id,name')
                  .eq('university_id', parent!)
              : db
                  .from('departments')
                  .select('id,name')
                  .eq('campus_id', parent!);
        const { data, error } = await query
          .order('name')
          .order('id')
          .range(start, start + 99);
        if (error) throw error;
        rows.push(...data);
        if (data.length < 100) break;
      }
      if (active) setItems(rows);
    }
    load()
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [table, parent, retry]);
  return (
    <div>
      <label>
        {label}
        <select
          disabled={busy || parent === null || error}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value || null)}
        >
          <option value="">
            {busy
              ? '불러오는 중…'
              : items.length
                ? '선택 안 함'
                : '등록된 항목 없음'}
          </option>
          {items.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </select>
      </label>
      {error && (
        <button type="button" onClick={() => setRetry((v) => v + 1)}>
          {label} 다시 불러오기
        </button>
      )}
    </div>
  );
}
