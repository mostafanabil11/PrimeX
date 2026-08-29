export interface JwtPayload {
  sub: string;
  // Nullable since members created at the front desk or by a website
  // reservation have no email. They cannot sign in — their password is random
  // bytes nobody holds — so in practice this is always a string on a real
  // token, but the type stays honest rather than relying on that.
  email: string | null;
  role: string;
  type?: 'access' | 'refresh';
}
