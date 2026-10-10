'use client';

import { useActionState } from 'react';

export default function AuthForm({ action, mode }) {
  const [state, formAction, pending] = useActionState(action, null);
  const isSignup = mode === 'signup';

  return (
    <form action={formAction} className="box auth-form">
      <h2 className="box-title">{isSignup ? 'Join EyeMe' : 'Member Login'}</h2>
      <div className="box-body">
        <label>
          Username
          <input name="username" required autoComplete="username" />
        </label>
        {isSignup && (
          <label>
            Display name
            <input name="display_name" placeholder="What friends see" maxLength={50} />
          </label>
        )}
        <label>
          Password
          <input
            name="password"
            type="password"
            required
            minLength={isSignup ? 8 : undefined}
            autoComplete={isSignup ? 'new-password' : 'current-password'}
          />
        </label>
        {state?.error && <p className="error">{state.error}</p>}
        <button className="btn" disabled={pending}>
          {pending ? '...' : isSignup ? 'Sign up' : 'Log in'}
        </button>
      </div>
    </form>
  );
}
