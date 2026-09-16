import * as crypto from 'node:crypto';
import {
  RegisterUserInputSchema,
  LoginInputSchema,
  type AuthIdentity,
  type AuthSession,
  type LoginInput,
  type RegisterUserInput,
  type User,
} from '@controlplane/contracts';
import { createRepositoryContainer, type RepositoryContainer } from '@controlplane/database';

export interface AuthPasswordRecord {
  userId: string;
  hash: string;
  salt: string;
}

export class AuthenticationService {
  private passwords = new Map<string, AuthPasswordRecord>();
  private activeSessions = new Map<
    string,
    { user: User; expiresAt: Date; identity: AuthIdentity }
  >();

  constructor(private repos: RepositoryContainer = createRepositoryContainer()) {}

  /**
   * Securely hash password using PBKDF2 SHA-512 with 10,000 iterations
   */
  public hashPassword(password: string, salt: string): string {
    return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  }

  /**
   * Constant-time comparison between two hex strings to mitigate timing attacks
   */
  public verifyPasswordHash(providedPassword: string, salt: string, expectedHash: string): boolean {
    const calculatedHash = this.hashPassword(providedPassword, salt);
    const calculatedBuffer = Buffer.from(calculatedHash, 'hex');
    const expectedBuffer = Buffer.from(expectedHash, 'hex');

    if (calculatedBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(calculatedBuffer, expectedBuffer);
  }

  /**
   * Register a new user and create an initial organization if requested
   */
  public async register(rawInput: RegisterUserInput): Promise<AuthSession> {
    // Validate schema
    const input = RegisterUserInputSchema.parse(rawInput);

    // Check if user already exists
    const existing = await this.repos.users.findByEmail(input.email);
    if (existing) {
      throw new Error(`Registration failed: User with email ${input.email} already exists`);
    }

    // Create user entity
    const user = await this.repos.users.create({
      email: input.email,
      name: input.name,
    });

    // Hash and store password
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = this.hashPassword(input.password, salt);
    this.passwords.set(user.id, { userId: user.id, hash, salt });

    // Create organization if provided
    let organizationId: string | undefined;
    if (input.organizationName) {
      const org = await this.repos.organizations.create({
        name: input.organizationName,
      });
      organizationId = org.id;

      // Create owner role
      const ownerRole = await this.repos.roles.create({
        organizationId: org.id,
        name: 'Owner',
        description: 'Organization administrator with full access',
        permissions: ['*'],
      });
      // Log registration audit event
      await this.repos.auditEvents.create({
        organizationId: org.id,
        actorId: user.id,
        action: 'USER_REGISTERED',
        resourceType: 'USER',
        resourceId: user.id,
        after: { email: user.email, name: user.name, role: ownerRole.name },
      });
    }

    // Generate Session
    const userRole = input.organizationName ? 'OWNER' : 'MEMBER';
    return this.createSession(user, organizationId, userRole);
  }

  /**
   * Login user with email and password using constant-time hash verification
   */
  public async login(rawInput: LoginInput): Promise<AuthSession> {
    const input = LoginInputSchema.parse(rawInput);

    const user = await this.repos.users.findByEmail(input.email);
    if (!user) {
      // Dummy constant-time hash to mitigate timing side-channel on non-existent accounts
      const dummySalt = '0'.repeat(32);
      const dummyHash = '0'.repeat(128);
      this.verifyPasswordHash(input.password, dummySalt, dummyHash);
      throw new Error('Authentication failed: Invalid email or password');
    }

    const record = this.passwords.get(user.id);
    if (!record) {
      throw new Error('Authentication failed: Invalid email or password');
    }

    const isValid = this.verifyPasswordHash(input.password, record.salt, record.hash);
    if (!isValid) {
      throw new Error('Authentication failed: Invalid email or password');
    }

    return this.createSession(user);
  }

  /**
   * Create authenticated session token with cryptographic randomness
   */
  public createSession(
    user: User,
    organizationId?: string,
    role: 'OWNER' | 'ADMIN' | 'DEVELOPER' | 'MEMBER' | 'VIEWER' = 'MEMBER',
    ttlMs: number = 24 * 60 * 60 * 1000,
  ): AuthSession {
    const token = `cp_sess_${crypto.randomBytes(32).toString('hex')}`;
    const expiresAt = new Date(Date.now() + ttlMs);

    const identity: AuthIdentity = {
      userId: user.id,
      email: user.email,
      name: user.name,
      organizationId,
      role,
    };

    this.activeSessions.set(token, {
      user,
      expiresAt,
      identity,
    });

    return {
      token,
      user,
      expiresAt: expiresAt.toISOString(),
    };
  }

  /**
   * Verify session token and return authenticated identity
   */
  public async verifyToken(token: string): Promise<AuthIdentity> {
    if (!token || typeof token !== 'string') {
      throw new Error('Unauthorized: Missing or malformed token');
    }

    const session = this.activeSessions.get(token);
    if (!session) {
      throw new Error('Unauthorized: Invalid session token');
    }

    if (session.expiresAt.getTime() < Date.now()) {
      this.activeSessions.delete(token);
      throw new Error('Unauthorized: Session token has expired');
    }

    return session.identity;
  }

  /**
   * Logout user by invalidating session token
   */
  public async logout(token: string): Promise<boolean> {
    return this.activeSessions.delete(token);
  }
}
