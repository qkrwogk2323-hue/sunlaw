drop trigger if exists audit_signup_requests on public.organization_signup_requests;
create trigger audit_signup_requests after insert or update or delete on public.organization_signup_requests
for each row execute procedure audit.capture_row_change();
drop trigger if exists audit_invitations on public.invitations;
create trigger audit_invitations after insert or update or delete on public.invitations
for each row execute procedure audit.capture_row_change();
drop trigger if exists audit_case_messages on public.case_messages;
create trigger audit_case_messages after insert or update or delete on public.case_messages
for each row execute procedure audit.capture_row_change();
drop trigger if exists audit_case_requests on public.case_requests;
create trigger audit_case_requests after insert or update or delete on public.case_requests
for each row execute procedure audit.capture_row_change();
drop trigger if exists audit_case_request_attachments on public.case_request_attachments;
create trigger audit_case_request_attachments after insert or update or delete on public.case_request_attachments
for each row execute procedure audit.capture_row_change();
drop trigger if exists audit_billing_entries on public.billing_entries;
create trigger audit_billing_entries after insert or update or delete on public.billing_entries
for each row execute procedure audit.capture_row_change();
drop trigger if exists audit_stage_templates on public.case_stage_templates;
create trigger audit_stage_templates after insert or update or delete on public.case_stage_templates
for each row execute procedure audit.capture_row_change();
drop trigger if exists audit_stage_template_steps on public.case_stage_template_steps;
create trigger audit_stage_template_steps after insert or update or delete on public.case_stage_template_steps
for each row execute procedure audit.capture_row_change();

drop trigger if exists trg_signup_requests_updated_at on public.organization_signup_requests;
create trigger trg_signup_requests_updated_at before update on public.organization_signup_requests
for each row execute procedure app.set_updated_at();
drop trigger if exists trg_invitations_updated_at on public.invitations;
create trigger trg_invitations_updated_at before update on public.invitations
for each row execute procedure app.set_updated_at();
drop trigger if exists trg_case_messages_updated_at on public.case_messages;
create trigger trg_case_messages_updated_at before update on public.case_messages
for each row execute procedure app.set_updated_at();
drop trigger if exists trg_case_requests_updated_at on public.case_requests;
create trigger trg_case_requests_updated_at before update on public.case_requests
for each row execute procedure app.set_updated_at();
drop trigger if exists trg_billing_entries_updated_at on public.billing_entries;
create trigger trg_billing_entries_updated_at before update on public.billing_entries
for each row execute procedure app.set_updated_at();
drop trigger if exists trg_stage_templates_updated_at on public.case_stage_templates;
create trigger trg_stage_templates_updated_at before update on public.case_stage_templates
for each row execute procedure app.set_updated_at();
