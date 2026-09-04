# Active Flag Behavior - KLS3 Sales OS

## Architecture Overview

KLS3 Sales OS uses JWT-based session authentication with an 8-hour session lifetime.

The `Active` flag in the USERS table controls **new login attempts**, not active sessions.

---

## How Active Flag Works

### Active = true (Normal State)

```
User attempts login
  → getUserByEmail() fetches user from Airtable
  → Check: user.active === true ✅
  → bcrypt.compare(password, hash)
  → Create JWT session (8 hours)
  → User logged in
```

**User can:**
- ✅ Login successfully
- ✅ Access all protected routes
- ✅ Session remains valid for 8 hours (or until logout)

---

### Active = false (Account Disabled)

```
User attempts NEW login
  → getUserByEmail() fetches user from Airtable
  → Check: user.active === true ❌ (false)
  → Return null (login rejected)
  → Error: "Email ou mot de passe incorrect."
```

**User cannot:**
- ❌ Login (new session creation blocked)

**BUT existing session:**
- ⚠️  **Remains valid** until expiration or logout
- ⚠️  No Airtable lookup on every request
- ⚠️  JWT is self-contained and validated locally

---

## Critical Behavior

### Scenario: Disable Active During Active Session

**Timeline:**

```
T0: User logs in (Active = true)
  → JWT session created
  → maxAge: 8 hours
  → Session valid until T0 + 8h

T1: Admin sets Active = false in Airtable USERS

T2: User refreshes page or navigates
  → Session still valid ✅
  → No Airtable lookup
  → JWT validated locally
  → User can still access app

T3: User attempts new login
  → Airtable lookup: Active = false
  → Login rejected ❌

T0 + 8h: Session expires
  → User logged out automatically
  → Must login again
  → Login blocked (Active = false)
```

---

## Why This Architecture?

**Performance:**
- ✅ No database query on every request
- ✅ Fast JWT validation (local cryptographic verification)
- ✅ Scalable (no session store)

**Security tradeoff:**
- ⚠️  Active flag not real-time for existing sessions
- ⚠️  8-hour window where disabled user can still use app
- ✅ New logins blocked immediately

---

## Immediate Account Revocation

**Current architecture does NOT support instant session termination.**

If you need to **immediately** revoke access:

### Option 1: Wait for Session Expiration
- Max wait: 8 hours
- User will be logged out automatically
- Cannot re-login (Active = false)

### Option 2: User Logout
- Ask user to logout
- Cannot login again (Active = false)

### Option 3: Change Password
- Use password rotation script
- User's current session still valid
- But if they logout, they cannot login with old password
- New password not shared = effective revocation

### Option 4: Architecture Change (Not Implemented)
- Store session IDs in database
- Check session validity on each request
- Performance cost: database lookup per request
- Complexity: session store management

**For Phase 8:** We accept the 8-hour window for simplicity and performance.

---

## Recommended Workflow

### Disable User Account

1. **Set Active = false** in Airtable USERS
   - New logins blocked immediately ✅

2. **Rotate password** (optional, extra security)
   - Use `scripts/rotate-eric-password.ts` pattern
   - Even if user has session, cannot re-login after logout

3. **Wait for session expiration** (max 8 hours)
   - Or ask user to logout

4. **User fully revoked**

---

## Re-enable User Account

1. **Set Active = true** in Airtable USERS
   - User can login immediately ✅

2. **(Optional) Provide new password**
   - If password was rotated during disable period

---

## Future Enhancements (Not V1)

If instant revocation becomes critical:

### Server-Side Session Store
```typescript
// On every protected request:
const sessionValid = await checkSessionInDB(sessionId)
if (!sessionValid) {
  return redirect('/login')
}
```

**Tradeoff:**
- ✅ Instant revocation
- ❌ Database query on every request
- ❌ Requires Redis/database for session store
- ❌ Added complexity

**For now:** Keep current JWT-only architecture for simplicity.

---

## Summary

| Action | New Login | Active Session |
|--------|-----------|----------------|
| Active = true | ✅ Allowed | ✅ Valid |
| Active = false | ❌ Blocked | ⚠️  Still valid (up to 8h) |
| Session expires | - | ❌ Must re-login |
| User logout | - | ❌ Must re-login |

**Key point:** Active flag affects **login**, not **active sessions**.

---

## Code References

**Login check:** `auth.config.ts:35`
```typescript
if (!user.active) {
  return null  // Login blocked
}
```

**No per-request check:** Sessions validated via JWT signature only.

**Session maxAge:** `auth.config.ts:91`
```typescript
session: {
  strategy: 'jwt',
  maxAge: 8 * 60 * 60, // 8 hours
}
```

---

**Documentation accurate as of Phase 8 implementation.**
