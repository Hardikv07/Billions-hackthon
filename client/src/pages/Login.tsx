import { motion } from 'framer-motion';
import { useState, type FormEvent } from 'react';
import { LogoMark } from '@/components/Logo';
import { Alert, Button, Field } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { ApiError, humanError } from '@/lib/api';

export default function Login() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('officer@nirman.demo');
  const [password, setPassword] = useState('demo123');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setError('');
    try {
      await signIn(email, password);
    } catch (err) {
      setError(err instanceof ApiError && err.status === 401 ? 'Incorrect email or password.' : humanError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center px-5 py-12">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
        className="w-full max-w-[380px]">
        <LogoMark className="mx-auto h-12 w-12 rounded-[14px]" />
        <h1 className="mt-8 text-balance text-center text-[30px] font-semibold leading-tight tracking-[-0.03em] sm:text-[34px]">
          Sign in to NIRMAN 360
        </h1>
        <p className="mt-3 text-center text-callout text-fg2">From tender to timely delivery.</p>

        <form onSubmit={submit} className="mt-10 space-y-5" noValidate>
          <Field label="Email">
            {(p) => (
              <input {...p} type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                autoComplete="username" inputMode="email" required className="input" />
            )}
          </Field>
          <Field label="Password">
            {(p) => (
              <input {...p} type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password" required className="input" />
            )}
          </Field>

          {error && <Alert tone="bad">{error}</Alert>}

          <Button type="submit" variant="primary" size="lg" loading={busy} className="w-full">
            {busy ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        <p className="mt-8 text-center text-foot text-fg2">
          Demo access is filled in for you: officer@nirman.demo · demo123
        </p>
      </motion.div>
    </main>
  );
}
