# Multi-Tenant Data Isolation Audit

Scope:

- `src/api/utils/database.helper.ts`
- `src/api/services/championship/*.ts`
- `src/api/services/user/user.service.ts`
- `src/api/services/profile/profile.service.ts`

Focus:

- Multi-tenant data isolation only.
- Query safety for `find`, `findOne`, `findById`, `updateOne`, `findByIdAndUpdate`, `deleteOne`, `aggregate`, `paginate`, and `save` on tenant resources.

No code changes were made as part of this audit report.

## Finding 1

* Severity: High
* File: `src/api/services/championship/register.service.ts`
* Root cause:

`DatabaseHelper.findById` is called with arguments in the wrong order.

Affected code section:

```ts
const registration = await DatabaseHelper.findById(
    Registration,
    tenant,
    registrationId
);
```

Expected helper signature:

```ts
findById(model, id, tenant, options?)
```

Current call effectively passes:

```ts
model = Registration
id = tenant
tenant = registrationId
```

* Risk:

This breaks tenant isolation and correctness. Normally it will fail to find the registration. In worse cases, if a tenant string is ObjectId-like, the query could search the wrong tenant namespace using the wrong ID.

Tenant-safe or unsafe: unsafe.

* Recommended minimal fix:

Manually swap the arguments:

```ts
DatabaseHelper.findById(Registration, registrationId, tenant)
```

* Why this fix:

It restores the intended helper contract: lookup `registrationId` only inside the provided `tenant`.

* Validation steps:

- Create two tenants with registrations.
- Call registration status for tenant A using a registration ID from tenant B.
- Confirm tenant A receives not found.
- Confirm tenant B can fetch its own registration.
- Run `bun tsc --noEmit`.

## Finding 2

* Severity: High
* File: `src/api/utils/database.helper.ts`
* Root cause:

`getWithOutTenant` intentionally bypasses `model.byTenant(tenant)` and uses raw pagination.

Affected code section:

```ts
const result = await model.paginate(query, options);
```

* Risk:

If any tenant-owned model is passed into this helper, records from all tenants can be paginated and returned. This is a direct cross-tenant data exposure risk.

Tenant-safe or unsafe: unsafe for tenant resources. Safe only for truly global/non-tenant collections.

* Recommended minimal fix:

Do not use `getWithOutTenant` for tenant-scoped models. If keeping it, document or rename it clearly as global-only, and manually verify callers use it only for global collections.

* Why this fix:

It preserves current architecture while preventing accidental misuse. Tenant-scoped reads should continue using `DatabaseHelper.getItems(...)`, which uses `model.byTenant(tenant).paginate(...)`.

* Validation steps:

- Search usages of `getWithOutTenant`.
- Confirm every caller passes only global collections.
- Add a manual review note or test for any future caller.
- For tenant resources, validate pagination through `DatabaseHelper.getItems`.

## Finding 3

* Severity: Medium
* File: `src/api/utils/database.helper.ts`
* Root cause:

Tenant isolation depends on `mongo-tenant` behavior through `model.byTenant(tenant)` rather than explicit tenant predicates in query filters.

Affected code sections:

```ts
model.byTenant(tenant).find(query)
model.byTenant(tenant).findOne(query)
model.byTenant(tenant).findByIdAndUpdate(...)
model.byTenant(tenant).paginate(...)
model.byTenant(tenant).findOneAndUpdate(...)
model.byTenant(tenant).findById(...)
```

* Risk:

If `mongo-tenant` does not scope a specific method consistently, especially `findByIdAndUpdate`, `findById`, or `paginate`, tenant isolation could silently fail.

Tenant-safe or unsafe: tenant-safe if `mongo-tenant` reliably scopes all these methods. Medium operational risk because safety is implicit.

* Recommended minimal fix:

Keep the current pattern, but prefer helper methods that use `model.byTenant(tenant)` consistently. Avoid raw model calls in services. For high-risk updates, consider manually using `findOneAndUpdate({ _id: id }, ...)` through `byTenant(tenant)` instead of relying on `findByIdAndUpdate`.

* Why this fix:

It keeps the architecture intact while reducing reliance on edge-case plugin behavior.

* Validation steps:

- Test same `_id` access attempts across two tenants.
- Test update/delete attempts across tenants.
- Confirm `byTenant(tenant).findByIdAndUpdate(...)` cannot update another tenant's document.
- Run `bun tsc --noEmit`.

## Finding 4

* Severity: Medium
* File: `src/api/services/championship/championship.service.ts`
* Root cause:

`save()` is used after tenant-scoped reads.

Affected code sections:

```ts
const championship = await DatabaseHelper.findById(Championship, championshipId, tenant);
...
return await championship.save();
```

Appears in:

```ts
registerTeam(...)
setWinners(...)
```

* Risk:

The `save()` itself does not include a tenant predicate. If the document was ever loaded incorrectly, `save()` would persist changes without re-checking tenant ownership. In the current code path, the initial read is tenant-scoped, so this is acceptable but worth recognizing.

Tenant-safe or unsafe: mostly tenant-safe because the document is first loaded through `DatabaseHelper.findById(..., tenant)`.

* Recommended minimal fix:

No urgent change required. If manually hardening later, replace read-mutate-save with a tenant-scoped update helper where practical.

* Why this fix:

Current behavior is safe enough because the document comes from a tenant-bound query. Replacing immediately may change validation/hooks behavior, so it is not a minimal required fix.

* Validation steps:

- Attempt `registerTeam` with a championship ID from another tenant.
- Confirm not found.
- Attempt `setWinners` with another tenant's championship ID.
- Confirm not found.
- Confirm existing save hooks still work if later changed.

## Finding 5

* Severity: Low
* File: `src/api/services/championship/group.service.ts`
* Root cause:

Active `save()` is used on a model instance created from `Group.byTenant(data.tenant)`.

Affected code section:

```ts
const tenantBoundGroup = Group.byTenant(data.tenant);
const group = new tenantBoundGroup({
    groupDistributionId: new Types.ObjectId(data.groupDistributionId),
    name: data.name,
    teams: data.teamIds.map(id => new Types.ObjectId(id)),
    rankings: data.teamIds.map((teamId: any, index: any) => ({
        teamId: new Types.ObjectId(teamId),
        position: index + 1,
        points: 0,
        matchesPlayed: 0,
        matchesWon: 0,
        matchesLost: 0,
        setsWon: 0,
        setsLost: 0,
        pointsScored: 0,
        pointsConceded: 0
    }))
});

return await group.save();
```

* Risk:

Low. Because the instance is created from the tenant-bound model, it should receive tenant metadata from `mongo-tenant`.

Tenant-safe or unsafe: tenant-safe.

* Recommended minimal fix:

No change required.

* Why this fix:

This follows the project's established multi-tenant pattern.

* Validation steps:

- Create a group under tenant A.
- Confirm it does not appear under tenant B.
- Confirm created document contains the expected tenant metadata.

## Finding 6

* Severity: Low
* File: `src/api/services/championship/group.service.ts`
* Root cause:

Commented-out code contains raw non-tenant queries.

Affected commented sections:

```ts
// const group = await Group.findById(groupId);
```

```ts
// return await Group.findByIdAndUpdate(
//     groupId,
//     { rankings },
//     { new: true }
// );
```

* Risk:

No runtime risk today, but if uncommented later, it would bypass `Group.byTenant(tenant)` and allow cross-tenant reads/updates.

Tenant-safe or unsafe: unsafe if re-enabled. Currently inactive.

* Recommended minimal fix:

If this code is ever restored, use `DatabaseHelper.findOne(...)`, `DatabaseHelper.update(...)`, or `Group.byTenant(tenant)`.

* Why this fix:

Keeps future code aligned with the current tenant isolation pattern.

* Validation steps:

- No runtime validation needed while commented.
- If re-enabled, add cross-tenant tests before merging.

## Tenant-Safe Query Notes

These inspected operations are tenant-safe under the current project pattern because they use `DatabaseHelper` tenant-aware methods or `Model.byTenant(tenant)`:

```ts
DatabaseHelper.find(...)
DatabaseHelper.findOne(...)
DatabaseHelper.findById(...)
DatabaseHelper.update(...)
DatabaseHelper.create(...)
DatabaseHelper.delete(...)
DatabaseHelper.findOneAndUpdate(...)
DatabaseHelper.getItems(...)
DatabaseHelper.getItemsWithRelations(...)
DatabaseHelper.findOneWithRelations(...)
DatabaseHelper.createWithRelations(...)
```

Examples confirmed safe:

```ts
Championship.byTenant(tenant).paginate(...)
Championship.byTenant(tenant).find(...)
User.byTenant(tenant).findByIdAndUpdate(...)
DatabaseHelper.getItems(User, tenant, ...)
DatabaseHelper.findById(User, userId, tenant, ...)
DatabaseHelper.findOne(InvitationLink, tenant, ...)
DatabaseHelper.update(Registration, registrationId, tenant, ...)
```

## Suggested Manual Changes

- Fix argument order in `RegistrationService.getRegistrationStatus`.
- Mark `DatabaseHelper.getWithOutTenant` as global-only, or avoid it completely for tenant resources.
- Keep using `DatabaseHelper` / `Model.byTenant(tenant)` consistently.
- Do not re-enable commented raw `Group.findById` / `Group.findByIdAndUpdate` without tenant scoping.

## Suggested Commit Message

```text
fix: correct tenant-scoped registration lookup
```

## Suggested Test Cases

- Tenant A cannot fetch Tenant B registration status.
- Tenant B can fetch its own registration status.
- Tenant A cannot update Tenant B championship.
- Tenant A cannot update Tenant B profile.
- Tenant-specific pagination returns only records for the current tenant.
- Group creation stores and returns data only under the creating tenant.

