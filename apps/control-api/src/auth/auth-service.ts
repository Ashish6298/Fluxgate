import * as crypto from 'node:crypto';
import type {
  AuthIdentity,
  AuthSession,
  LoginInput,
  RegisterUserInput,
  User,
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
   * Securely hash password using PBKDF2 SHA-512
   */
  public hashPassword(password: string, salt: string): string {
    return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  }

  /**
   * Register a new user and create an initial organization if requested
   */
  public async register(input: RegisterUserInput): Promise<AuthSession> {
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
   * Login user with email and password
   */
  public async login(input: LoginInput): Promise<AuthSession> {
    const user = await this.repos.users.findByEmail(input.email);
    if (!user) {
      throw new Error('Authentication failed: Invalid email or password');
    }

    const record = this.passwords.get(user.id);
    if (!record) {
      throw new Error('Authentication failed: No credentials found for user');
    }

    const calculatedHash = this.hashPassword(input.password, record.salt);
    if (calculatedHash !== record.hash) {
      throw new Error('Authentication failed: Invalid email or password');
    }

    return this.createSession(user);
  }

  /**
   * Create authenticated session token
   */
  private createSession(
    user: User,
    organizationId?: string,
    role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER' = 'MEMBER',
  ): AuthSession {
    const token = `cp_sess_${crypto.randomBytes(32).toString('hex')}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hour TTL

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
    const session = this.activeSessions.get(token);
    if (!session) {
      throw new Error('Unauthorized: Invalid or expired session token');
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
