export interface RequestUser {
  userId: string;
  // See JwtPayload — nullable for members who have no email on file.
  email: string | null;
  role: string;
}
