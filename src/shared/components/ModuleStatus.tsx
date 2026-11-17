export function ModuleStatus({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <section>
      <h1>{title}</h1>
      <p>{description}</p>
      <div className="status" role="status">
        개발 환경 준비 완료 · 서비스 기능은 아직 구현되지 않았습니다. 실제
        데이터와 연결한 후 이용할 수 있습니다.
      </div>
    </section>
  );
}
