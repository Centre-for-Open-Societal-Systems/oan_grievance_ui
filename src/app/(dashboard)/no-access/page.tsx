// Deliberately absent from `ROUTE_ROLES` in rbac.ts — this is the one route
// every authenticated session can always reach, which is what makes it safe
// as `DEFAULT_HOME_ROUTE`. It's where a user with no recognized role (none of
// Submitter/Officer/Admin) lands instead of bouncing between restricted pages.
export default function NoAccessPage() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-bold text-gray-900">No access assigned yet</h1>
        <p className="mt-2 text-sm text-gray-600">
          Your account isn&apos;t assigned a recognized role in the grievance portal. Please contact your
          administrator to get one assigned.
        </p>
      </div>
    </div>
  );
}
