import { AppError } from "../errors/AppError.js";

/**
 * Ensures a resource belongs to the authenticated user.
 * Backend ownership checks are authoritative; do not rely on the client.
 */
export function assertOwnership(
  resourceOwnerId: string,
  authenticatedUserId: string,
): void {
  if (resourceOwnerId !== authenticatedUserId) {
    throw new AppError(403, "You do not have access to this resource.", "FORBIDDEN");
  }
}
