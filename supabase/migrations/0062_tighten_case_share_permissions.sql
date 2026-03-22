-- 0062: organization_collaboration_case_shares 쓰기 권한 강화
-- 목적:
-- 0054에서 case_shares_write 정책이 app.is_org_member(shared_by_organization_id) 수준으로
-- 너무 넓게 열려 있음. 사건 공유는 최소 org_manager 이상이어야 함.

drop policy if exists organization_collaboration_case_shares_write on public.organization_collaboration_case_shares;

create policy organization_collaboration_case_shares_write
  on public.organization_collaboration_case_shares
  for all
  to authenticated
  using (
    app.is_platform_admin()
    or app.is_org_manager(shared_by_organization_id)
  )
  with check (
    app.is_platform_admin()
    or app.is_org_manager(shared_by_organization_id)
  );
