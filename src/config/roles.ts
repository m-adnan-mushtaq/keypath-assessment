const allRoles = {
  tenant: ['getOwnProfile', 'redeemCredits', 'viewOwnCredits'],
  landlord: ['manageProperties', 'manageUnits', 'manageTenants', 'manageCredits', 'viewLedger'],
  admin: ['getUsers', 'manageUsers', 'manageProperties', 'manageUnits', 'manageTenants', 'manageCredits', 'viewLedger'],
};

export const roles: string[] = Object.keys(allRoles);
export const roleRights: Map<string, string[]> = new Map(Object.entries(allRoles));

