# Next-step implementation notes

This package includes real patches for the highest-risk issues identified in the code review:

1. invitation token handling switched to token_hash lookup
2. support session secret fallback removed
3. portal query scope narrowed to the authenticated case client
4. portal-related RLS tightened for handlers/parties/case orgs
5. dynamic configuration foundation tables and services added
6. typecheck script added

Remaining high-priority work:
- move flattened permissions toward template + override row enforcement
- make complex writes transactional or wrap in RPC
- rewire all list/dashboard/inbox/collections queries around case_organizations
- implement settings admin UI
