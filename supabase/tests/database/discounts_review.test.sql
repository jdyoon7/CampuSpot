begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
insert into auth.users(id) values
 ('51000000-0000-4000-8000-000000000001'), ('51000000-0000-4000-8000-000000000002'),
 ('51000000-0000-4000-8000-000000000003'), ('51000000-0000-4000-8000-000000000004');
insert into user_roles(user_id,role) values
 ('51000000-0000-4000-8000-000000000002','admin'),('51000000-0000-4000-8000-000000000003','super_admin');
insert into discount_reports(id,reporter_id,store_name,details,source_url)
 select ('52000000-0000-4000-8000-00000000000'||n)::uuid,'51000000-0000-4000-8000-000000000001','Test '||n,'test','https://example.test'
 from generate_series(1,3) n;
update discount_reports set starts_on='2000-01-01',ends_on='2000-01-02' where store_name='Test 3';
set local role anon;
select is((select count(*) from list_published_discounts() where store_name like 'Test %'),0::bigint,'pending reports are private');
select throws_ok($q$select review_discount_report('52000000-0000-4000-8000-000000000001','approved')$q$,'42501',null,'guest cannot review');
reset role;
set local role authenticated;
set local request.jwt.claim.sub='51000000-0000-4000-8000-000000000004';
select is((select count(*) from discount_reports),0::bigint,'ordinary member cannot read queue');
select throws_ok($q$select review_discount_report('52000000-0000-4000-8000-000000000001','approved')$q$,'42501',null,'member RPC cannot approve');
set local request.jwt.claim.sub='51000000-0000-4000-8000-000000000002';
select is((select count(*) from discount_reports where status='pending'),3::bigint,'admin sees pending reports');
select throws_ok($q$update discount_reports set status='approved'$q$,'42501',null,'admin must use audited RPC');
insert into discount_reports(reporter_id,store_name,details,source_url) values(auth.uid(),'Own','test','https://example.test');
select throws_ok($q$select review_discount_report((select id from discount_reports where store_name='Own'),'approved')$q$,'P0002',null,'admin cannot review own submission');
select throws_ok($q$select review_discount_report('52000000-0000-4000-8000-000000000001','pending')$q$,'22023',null,'pending is not a decision');
select throws_ok($q$select review_discount_report('52000000-0000-4000-8000-000000000001','rejected',E' \t\n')$q$,'22023',null,'rejection needs a nonblank reason');
select throws_ok($q$select review_discount_report('52000000-0000-4000-8000-000000000001','rejected',repeat('a',501))$q$,'22023',null,'reason length enforced');
select lives_ok($q$select review_discount_report('52000000-0000-4000-8000-000000000001','approved')$q$,'admin approves');
select throws_ok($q$select review_discount_report('52000000-0000-4000-8000-000000000001','rejected','late')$q$,'P0002',null,'a completed decision cannot be overwritten');
set local request.jwt.claim.sub='51000000-0000-4000-8000-000000000003';
select lives_ok($q$select review_discount_report('52000000-0000-4000-8000-000000000002','rejected','  확인 불가  ')$q$,'super admin rejects');
select lives_ok($q$select review_discount_report('52000000-0000-4000-8000-000000000003','approved')$q$,'expired offer review also recorded');
select is((select count(*) from discount_reports where status='rejected'),0::bigint,'resolved rejection reason disappears from reviewer queue');
set local request.jwt.claim.sub='51000000-0000-4000-8000-000000000001';
select is((select rejection_reason from discount_reports where status='rejected'),'확인 불가','reporter sees trimmed reason');
set local request.jwt.claim.sub='51000000-0000-4000-8000-000000000004';
select is((select count(*) from discount_reports where rejection_reason is not null),0::bigint,'others cannot see rejection reason');
select throws_ok('select * from core_private.discount_review_log','42501',null,'audit log private');
reset role;
set local role anon;
select results_eq('select store_name from list_published_discounts()','values (''Test 1''::text)','guest sees only approved, unexpired offer');
select ok(not exists(select from jsonb_object_keys((select to_jsonb(p) from list_published_discounts() p limit 1)) k where k in ('reporter_id','reviewer_id','rejection_reason')),'published projection has no private fields');
reset role;
select is((select count(*) from core_private.discount_review_log),3::bigint,'one audit record per successful transition');
select ok(exists(select from core_private.discount_review_log where decision='rejected' and reviewer_id='51000000-0000-4000-8000-000000000003'),'audit identifies reviewer');
select * from finish();
rollback;
