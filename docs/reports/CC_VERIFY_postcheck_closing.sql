-- Postcheck v2 S5/S4 보조 실DB 검증. 임의 UUID 합성 픽스처만 사용하고 마지막에 전부 ROLLBACK.
-- 원래 Vitest 통합 스위트의 실행 결과로 세지 않는다. 관리 SQL 연결에서 단일 요청으로 실행한다.
begin isolation level repeatable read;
set local statement_timeout='25s';
set local idle_in_transaction_session_timeout='30s';
do $verify$
declare
  coach_a uuid:=gen_random_uuid(); member_id uuid:=gen_random_uuid();
  coach_b uuid:=gen_random_uuid(); admin_id uuid:=gen_random_uuid();
  own_cohort uuid:=gen_random_uuid(); other_cohort uuid:=gen_random_uuid();
  own_code text:=translate(substr(replace(gen_random_uuid()::text,'-',''),1,5),'0123456789abcdef','ABCDEFGHJKMNPQRS');
  other_code text:=translate(substr(replace(gen_random_uuid()::text,'-',''),1,5),'0123456789abcdef','ABCDEFGHJKMNPQRS');
  pre_id uuid; post_id uuid; interpretation_id uuid;
  expected_open timestamptz; expected_expiry timestamptz:=now()+interval '30 days';
  before_rows jsonb; after_rows jsonb; before_count bigint; after_count bigint;
  result jsonb:='[]'; checks jsonb; stage text:='setup'; problem text;
  n bigint; c integer; blocked text; flag boolean; state text; access_mode text;
begin
  -- 트리거를 끄지 않는다. 관리 SQL 역할의 SET replication 권한과 무관하게 정상 가입 트리거를 사용한다.
  if current_setting('session_replication_role')<>'origin' then raise exception 'normal triggers disabled'; end if;
  insert into auth.users(id,email) values
    (coach_a,coach_a||'@postcheck.test'),(member_id,member_id||'@postcheck.test'),
    (coach_b,coach_b||'@postcheck.test'),(admin_id,admin_id||'@postcheck.test');
  insert into public.users(id,email,name,nickname,role) values
    (coach_a,coach_a||'@postcheck.test','QA coach A',coach_a::text,'coach'),
    (member_id,member_id||'@postcheck.test','QA participant',member_id::text,'user'),
    (coach_b,coach_b||'@postcheck.test','QA coach B',coach_b::text,'coach'),
    (admin_id,admin_id||'@postcheck.test','QA admin',admin_id::text,'admin')
    on conflict(id) do update set name=excluded.name,nickname=excluded.nickname,role=excluded.role;
  insert into public.cohorts(id,coach_id,instrument_id,name,code,status,max_members,kind,expires_at) values
    (own_cohort,coach_a,'futurenow','transaction QA A',own_code,'active',10,'seminar',expected_expiry),
    (other_cohort,coach_b,'futurenow','transaction QA B',other_code,'active',10,'seminar',expected_expiry);
  -- 기존 individual/held 회원도 마감 대상 등록자로 두어 회원행 보존 비교에 포함한다.
  insert into public.enrollments(cohort_id,user_id) values
    (own_cohort,member_id),(own_cohort,coach_a),(own_cohort,admin_id);
  insert into public.cohort_sessions(cohort_id,session_no,held_at,opens_at,closes_at)
    select x,k,now(),now()-interval '1 day',now()+interval '1 day'
    from unnest(array[own_cohort,other_cohort]) x cross join generate_series(1,3) k;
  if current_setting('session_replication_role')<>'origin' then raise exception 'normal triggers disabled'; end if;
  insert into public.memberships(user_id,status,valid_until,decided_at,decision_note) values
    (coach_a,'individual','2030-01-01',now(),'transaction fixture'),
    (admin_id,'held',null,now(),'transaction fixture');
  select count(*) into before_count from public.memberships;
  select coalesce(jsonb_agg(to_jsonb(m) order by user_id),'[]') into before_rows
    from public.memberships m where user_id=any(array[coach_a,member_id,coach_b,admin_id]);

  for c in 1..2 loop
    stage:=case when c=1 then 'post_unopened' else 'post_opened' end;
    expected_open:=case when c=1 then null else now()-interval '1 hour' end;
    update public.cohorts set status='active',post_opened_at=expected_open where id=own_cohort;
    checks:='{}'; pre_id:=gen_random_uuid(); post_id:=gen_random_uuid();
    execute 'set local role authenticated';
    perform set_config('request.jwt.claims',jsonb_build_object('sub',member_id,'role','authenticated')::text,true);
    perform set_config('request.jwt.claim.sub',member_id::text,true);
    if current_user<>'authenticated' or auth.uid()<>member_id then raise exception 'participant identity not active'; end if;
    select count(*) into n from public.resolve_cohort_by_code(own_code);
    if n<>1 then raise exception 'active code result %',n; end if;
    checks:=checks||jsonb_build_object('active_code_rows',n);
    insert into public.responses(id,instrument_id,cohort_id,user_id,wave,answers,subject_profile)
      values(pre_id,'futurenow',own_cohort,member_id,'pre','{}','{}');
    perform public.checkin_save(own_cohort,c,jsonb_build_object('qa','before archive'),'{}');
    execute 'reset role';

    execute 'set local role authenticated';
    perform set_config('request.jwt.claims',jsonb_build_object('sub',coach_a,'role','authenticated')::text,true);
    perform set_config('request.jwt.claim.sub',coach_a::text,true);
    if current_user<>'authenticated' or auth.uid()<>coach_a then raise exception 'coach identity not active'; end if;
    update public.cohorts set status='archived' where id=own_cohort;
    get diagnostics n=row_count;
    if n<>1 then raise exception 'archive returned % rows',n; end if;
    checks:=checks||jsonb_build_object('coach_archive_rows',n);
    execute 'reset role';
    select count(*) into after_count from public.memberships;
    select coalesce(jsonb_agg(to_jsonb(m) order by user_id),'[]') into after_rows
      from public.memberships m where user_id=any(array[coach_a,member_id,coach_b,admin_id]);
    if after_count<>before_count or after_rows is distinct from before_rows then raise exception 'membership mutated by archive'; end if;
    checks:=checks||jsonb_build_object('memberships_count_unchanged',true,'membership_stored_values_unchanged',true);

    execute 'set local role authenticated';
    perform set_config('request.jwt.claims',jsonb_build_object('sub',member_id,'role','authenticated')::text,true);
    perform set_config('request.jwt.claim.sub',member_id::text,true);
    if current_user<>'authenticated' or auth.uid()<>member_id then raise exception 'participant identity not active after archive'; end if;
    insert into public.responses(id,instrument_id,cohort_id,user_id,wave,answers,subject_profile)
      values(post_id,'futurenow',own_cohort,member_id,'post','{}','{}');
    get diagnostics n=row_count;
    if n<>1 then raise exception 'post insert rows %',n; end if;
    checks:=checks||jsonb_build_object('archived_post_insert_rows',n);
    perform public.checkin_save(own_cohort,c,jsonb_build_object('qa','after archive'),'{}');
    perform public.checkin_submit(own_cohort,c);
    select has_content and submitted_at is not null and answers->>'qa'='after archive'
      into flag from public.checkins where cohort_id=own_cohort and user_id=member_id and session_no=c;
    if flag is distinct from true then raise exception 'archived checkin save/submit failed'; end if;
    checks:=checks||jsonb_build_object('archived_checkin_save_submit',flag);

    blocked:=null;
    begin
      insert into public.checkins(cohort_id,user_id,session_no,answers) values(own_cohort,member_id,3,'{}');
    exception when others then blocked:=sqlstate; end;
    if blocked is distinct from '42501' then raise exception 'direct checkin SQLSTATE %',blocked; end if;
    checks:=checks||jsonb_build_object('direct_checkin_blocked',blocked);
    blocked:=null;
    begin
      insert into public.responses(instrument_id,cohort_id,user_id,wave,answers,subject_profile)
        values('futurenow',other_cohort,member_id,'post','{}','{}');
    exception when others then blocked:=sqlstate; end;
    if blocked is distinct from '42501' then raise exception 'other cohort post SQLSTATE %',blocked; end if;
    checks:=checks||jsonb_build_object('other_cohort_post_blocked',blocked);
    blocked:=null;
    begin perform public.checkin_save(other_cohort,c,'{"qa":"blocked"}','{}');
    exception when others then blocked:=sqlstate; end;
    if blocked is distinct from 'P0001' then raise exception 'other checkin save SQLSTATE %',blocked; end if;
    checks:=checks||jsonb_build_object('other_checkin_save_blocked',blocked);
    blocked:=null;
    begin perform public.checkin_submit(other_cohort,c);
    exception when others then blocked:=sqlstate; end;
    if blocked is distinct from 'P0001' then raise exception 'other checkin submit SQLSTATE %',blocked; end if;
    checks:=checks||jsonb_build_object('other_checkin_submit_blocked',blocked);

    select count(*) into n from public.resolve_cohort_by_code(own_code);
    if n<>0 then raise exception 'archived code visible'; end if;
    checks:=checks||jsonb_build_object('archived_code_rows',n);
    select count(*) into n from public.cohorts where id=own_cohort and status='archived';
    if n<>1 then raise exception 'own cohort ID read lost'; end if;
    checks:=checks||jsonb_build_object('archived_cohort_id_read_rows',n);
    select count(*) into n from public.my_cohorts() where cohort_id=own_cohort and status='archived';
    if n<>1 then raise exception 'my_cohorts archived record lost'; end if;
    checks:=checks||jsonb_build_object('my_cohorts_archived_rows',n);
    select count(*) into n from public.responses where id=pre_id;
    if n<>1 then raise exception 'pre record read lost'; end if;
    checks:=checks||jsonb_build_object('pre_record_read_rows',n);
    select public.member_state(member_id),public.member_tool_access(member_id) into state,access_mode;
    if state<>'pending' or access_mode<>'read_only' then raise exception 'last seminar close state %, %',state,access_mode; end if;
    checks:=checks||jsonb_build_object('last_close_state',state,'last_close_tool_access',access_mode);
    execute 'reset role';

    execute 'set local role authenticated';
    perform set_config('request.jwt.claims',jsonb_build_object('sub',coach_a,'role','authenticated')::text,true);
    perform set_config('request.jwt.claim.sub',coach_a::text,true);
    update public.cohorts set status='active' where id=own_cohort;
    get diagnostics n=row_count;
    if n<>1 then raise exception 'reopen rows %',n; end if;
    checks:=checks||jsonb_build_object('coach_reopen_rows',n);
    select status='active' and post_opened_at is not distinct from expected_open
      and expires_at is not distinct from expected_expiry into flag from public.cohorts where id=own_cohort;
    if flag is distinct from true then raise exception 'reopen changed dates'; end if;
    checks:=checks||jsonb_build_object('reopen_status_and_dates_preserved',flag);
    execute 'reset role';
    result:=result||jsonb_build_array(jsonb_build_object('scenario',stage,'checks',checks));
  end loop;

  stage:='two_active_seminars';
  insert into public.enrollments(cohort_id,user_id) values(other_cohort,member_id);
  select count(*) into n from public.memberships where user_id=member_id;
  if n<>0 then raise exception 'participant has assigned status'; end if;
  execute 'set local role authenticated';
  perform set_config('request.jwt.claims',jsonb_build_object('sub',coach_a,'role','authenticated')::text,true);
  perform set_config('request.jwt.claim.sub',coach_a::text,true);
  update public.cohorts set status='archived' where id=own_cohort;
  get diagnostics n=row_count;
  if n<>1 then raise exception 'first seminar close rows %',n; end if;
  execute 'reset role';
  execute 'set local role authenticated';
  perform set_config('request.jwt.claims',jsonb_build_object('sub',member_id,'role','authenticated')::text,true);
  perform set_config('request.jwt.claim.sub',member_id::text,true);
  select public.member_state(member_id),public.member_tool_access(member_id) into state,access_mode;
  if state<>'cohort' or access_mode<>'full' then raise exception 'remaining seminar access %, %',state,access_mode; end if;
  checks:=jsonb_build_object('after_one_close_state',state,'after_one_close_tool_access',access_mode,'participant_stored_membership_rows',0);
  execute 'reset role';
  execute 'set local role authenticated';
  perform set_config('request.jwt.claims',jsonb_build_object('sub',coach_b,'role','authenticated')::text,true);
  perform set_config('request.jwt.claim.sub',coach_b::text,true);
  update public.cohorts set status='archived' where id=other_cohort;
  get diagnostics n=row_count;
  if n<>1 then raise exception 'second seminar close rows %',n; end if;
  execute 'reset role';
  execute 'set local role authenticated';
  perform set_config('request.jwt.claims',jsonb_build_object('sub',member_id,'role','authenticated')::text,true);
  perform set_config('request.jwt.claim.sub',member_id::text,true);
  select public.member_state(member_id),public.member_tool_access(member_id) into state,access_mode;
  if state<>'pending' or access_mode<>'read_only' then raise exception 'both seminars closed access %, %',state,access_mode; end if;
  checks:=checks||jsonb_build_object('after_both_close_state',state,'after_both_close_tool_access',access_mode);
  execute 'reset role';
  result:=result||jsonb_build_array(jsonb_build_object('scenario',stage,'checks',checks));

  -- S4 보조: 실제 UPDATE RETURNING의 역할별 1행/0행. 합성 해석만 쓰고 롤백한다.
  stage:='interpretation_update_rls'; interpretation_id:=gen_random_uuid(); checks:='{}';
  insert into public.report_interpretations(id,response_id,cohort_id,ai_content,ai_model)
    values(interpretation_id,post_id,own_cohort,'{"headline":"synthetic","axes":[],"growth":"synthetic"}','synthetic');
  foreach pre_id in array array[coach_a,coach_b,member_id] loop
    execute 'set local role authenticated';
    perform set_config('request.jwt.claims',jsonb_build_object('sub',pre_id,'role','authenticated')::text,true);
    perform set_config('request.jwt.claim.sub',pre_id::text,true);
    with changed as (
      update public.report_interpretations set coach_content='{"headline":"synthetic edit","axes":[],"growth":"synthetic"}',
        edited_by=pre_id,edited_at=now()
      where response_id=post_id returning response_id
    ) select count(*) into n from changed;
    if n<>(case when pre_id=coach_a then 1 else 0 end) then raise exception 'interpretation RLS returned %',n; end if;
    checks:=checks||jsonb_build_object(case when pre_id=coach_a then 'own_coach_rows' when pre_id=coach_b then 'other_coach_rows' else 'participant_rows' end,n);
    execute 'reset role';
  end loop;
  execute 'set local role authenticated';
  perform set_config('request.jwt.claims',jsonb_build_object('sub',coach_a,'role','authenticated')::text,true);
  perform set_config('request.jwt.claim.sub',coach_a::text,true);
  with changed as (
    update public.report_interpretations set coach_content=null,edited_by=null,edited_at=null
    where response_id=post_id returning response_id
  ) select count(*) into n from changed;
  if n<>1 then raise exception 'own coach clear rows %',n; end if;
  checks:=checks||jsonb_build_object('own_coach_clear_rows',n);
  execute 'reset role';
  result:=result||jsonb_build_array(jsonb_build_object('scenario',stage,'checks',checks));
  perform set_config('postcheck.validation_result',jsonb_build_object(
    'status','passed','observed_at',clock_timestamp(),'scenarios',result,
    'fixture_user_ids',array[coach_a,member_id,coach_b,admin_id],
    'fixture_cohort_ids',array[own_cohort,other_cohort],
    'session_replication_role',current_setting('session_replication_role'))::text,true);
exception when others then
  get stacked diagnostics problem=message_text;
  perform set_config('postcheck.validation_result',jsonb_build_object('status','failed','stage',stage,'sqlstate',sqlstate,'error',problem)::text,true);
end;
$verify$;
select current_setting('postcheck.validation_result')::jsonb as verification;
rollback;

