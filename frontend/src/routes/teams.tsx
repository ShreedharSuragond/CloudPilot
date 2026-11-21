import * as React from 'react'
import {
  History,
  Mail,
  Shield,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react'
import { AppShell } from '@/components/layout/app-shell'
import { AuthGuard } from '@/components/auth/auth-guard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useCurrentOrganisationQuery,
  useOrganisationMembersQuery,
  useOrganisationInvitationsQuery,
  useAuditEventsQuery,
} from '@/features/organisations/organisation.queries'
import {
  useUpdateMemberRoleMutation,
  useRemoveMemberMutation,
  useRevokeInvitationMutation,
} from '@/features/organisations/organisation.mutations'
import { InviteMemberModal } from '@/features/organisations/invite-member-modal'

export function TeamsRoute() {
  const [inviteModalOpen, setInviteModalOpen] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState('members')

  const { data: currentOrg } = useCurrentOrganisationQuery()
  const { data: members, isPending: isMembersPending } = useOrganisationMembersQuery()
  const { data: invitations, isPending: isInvitesPending } = useOrganisationInvitationsQuery()
  const { data: auditEvents, isPending: isAuditPending } = useAuditEventsQuery()

  const updateRoleMutation = useUpdateMemberRoleMutation()
  const removeMemberMutation = useRemoveMemberMutation()
  const revokeInviteMutation = useRevokeInvitationMutation()

  const isCallerAdmin = currentOrg?.role === 'owner' || currentOrg?.role === 'admin'

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300 border-purple-200'
      case 'admin':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200'
      case 'member':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200'
      default:
        return 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200'
    }
  }

  const handleRoleChange = (userId: string, newRole: 'owner' | 'admin' | 'member' | 'viewer') => {
    updateRoleMutation.mutate({ userId, role: newRole })
  }

  const handleRemoveMember = (userId: string, email: string) => {
    if (confirm(`Are you sure you want to remove ${email} from this workspace?`)) {
      removeMemberMutation.mutate(userId)
    }
  }

  const handleRevokeInvite = (invitationId: string) => {
    revokeInviteMutation.mutate(invitationId)
  }

  return (
    <AuthGuard>
      <AppShell breadcrumbs={[{ label: 'Teams & Access' }]}>
        <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Shield className="size-4 text-primary" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Access & Governance
                </span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Teams & Ownership
              </h1>
              <p className="text-sm text-muted-foreground">
                Manage workspace members, role-based access control, pending invitations, and compliance audit trail.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {isCallerAdmin && (
                <Button
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setInviteModalOpen(true)}
                >
                  <UserPlus className="size-3.5" /> Invite Member
                </Button>
              )}
            </div>
          </div>

          {/* Main Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList>
              <TabsTrigger value="members" className="gap-2">
                <Users className="size-3.5" />
                Members ({members?.length ?? 0})
              </TabsTrigger>
              <TabsTrigger value="invitations" className="gap-2">
                <Mail className="size-3.5" />
                Invitations ({invitations?.length ?? 0})
              </TabsTrigger>
              <TabsTrigger value="audit" className="gap-2">
                <History className="size-3.5" />
                Audit Trail ({auditEvents?.length ?? 0})
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: MEMBERS */}
            <TabsContent value="members" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Workspace Members</CardTitle>
                  <CardDescription className="text-xs">
                    Users with active access to multi-cloud resources and telemetry in this workspace.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Joined At</TableHead>
                        {isCallerAdmin && <TableHead className="text-right">Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isMembersPending ? (
                        Array.from({ length: 3 }).map((_, i) => (
                          <TableRow key={i}>
                            <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                            {isCallerAdmin && <TableCell><Skeleton className="h-5 w-16 ml-auto" /></TableCell>}
                          </TableRow>
                        ))
                      ) : !members || members.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={isCallerAdmin ? 4 : 3} className="h-32 text-center text-sm text-muted-foreground">
                            No team members found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        members.map((member) => (
                          <TableRow key={member.userId}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary uppercase">
                                  {member.name ? member.name.charAt(0) : member.email.charAt(0)}
                                </span>
                                <div>
                                  <div className="text-xs font-semibold text-foreground">
                                    {member.name || 'Unnamed User'}
                                  </div>
                                  <div className="text-[11px] text-muted-foreground">
                                    {member.email}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {isCallerAdmin && member.role !== 'owner' ? (
                                <select
                                  value={member.role}
                                  onChange={(e) => handleRoleChange(member.userId, e.target.value as any)}
                                  className="h-7 rounded-md border border-input bg-background px-2 text-[11px] font-medium outline-none focus:border-ring"
                                >
                                  <option value="owner">Owner</option>
                                  <option value="admin">Admin</option>
                                  <option value="member">Member</option>
                                  <option value="viewer">Viewer</option>
                                </select>
                              ) : (
                                <Badge variant="outline" className={`capitalize text-[10px] ${getRoleBadgeVariant(member.role)}`}>
                                  {member.role}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {new Date(member.joinedAt).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </TableCell>
                            {isCallerAdmin && (
                              <TableCell className="text-right">
                                {member.role !== 'owner' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveMember(member.userId, member.email)}
                                    className="h-7 text-xs text-destructive hover:bg-destructive/10"
                                  >
                                    <Trash2 className="size-3.5 mr-1" />
                                    Remove
                                  </Button>
                                )}
                              </TableCell>
                            )}
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 2: INVITATIONS */}
            <TabsContent value="invitations" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Pending Invitations</CardTitle>
                  <CardDescription className="text-xs">
                    Invitations waiting to be accepted by colleagues.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email Address</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Sent At</TableHead>
                        <TableHead>Expires In</TableHead>
                        {isCallerAdmin && <TableHead className="text-right">Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isInvitesPending ? (
                        Array.from({ length: 2 }).map((_, i) => (
                          <TableRow key={i}>
                            <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                            {isCallerAdmin && <TableCell><Skeleton className="h-5 w-16 ml-auto" /></TableCell>}
                          </TableRow>
                        ))
                      ) : !invitations || invitations.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={isCallerAdmin ? 5 : 4} className="h-32 text-center text-sm text-muted-foreground">
                            No pending invitations.
                          </TableCell>
                        </TableRow>
                      ) : (
                        invitations.map((inv) => (
                          <TableRow key={inv.id}>
                            <TableCell className="text-xs font-medium">
                              {inv.email}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`capitalize text-[10px] ${getRoleBadgeVariant(inv.role)}`}>
                                {inv.role}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {new Date(inv.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {new Date(inv.expiresAt).toLocaleDateString()}
                            </TableCell>
                            {isCallerAdmin && (
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRevokeInvite(inv.id)}
                                  className="h-7 text-xs text-destructive hover:bg-destructive/10"
                                >
                                  Revoke
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 3: AUDIT TRAIL */}
            <TabsContent value="audit" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Immutable Audit Trail</CardTitle>
                  <CardDescription className="text-xs">
                    Security log recording administrative changes, membership updates, and account actions.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Actor</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Target</TableHead>
                        <TableHead>Timestamp</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isAuditPending ? (
                        Array.from({ length: 3 }).map((_, i) => (
                          <TableRow key={i}>
                            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                          </TableRow>
                        ))
                      ) : !auditEvents || auditEvents.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="h-32 text-center text-sm text-muted-foreground">
                            No audit events recorded yet.
                          </TableCell>
                        </TableRow>
                      ) : (
                        auditEvents.map((evt) => (
                          <TableRow key={evt.id}>
                            <TableCell>
                              <div className="text-xs font-medium text-foreground">
                                {evt.actorName || evt.actorEmail || 'System'}
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                {evt.actorEmail}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[10px] font-mono">
                                {evt.action}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground font-mono">
                              {evt.targetType} {evt.targetId ? `(${evt.targetId.slice(0, 8)}...)` : ''}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {new Date(evt.createdAt).toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <InviteMemberModal
          open={inviteModalOpen}
          onOpenChange={setInviteModalOpen}
        />
      </AppShell>
    </AuthGuard>
  )
}
