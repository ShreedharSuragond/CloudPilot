export const organisationQueryKeys = {
  all: ['organisations'] as const,
  detail: (organisationId: string) =>
    [...organisationQueryKeys.all, 'detail', organisationId] as const,
  memberships: (organisationId: string) =>
    [...organisationQueryKeys.detail(organisationId), 'memberships'] as const,
}
