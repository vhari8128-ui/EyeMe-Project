import Link from 'next/link';
import AuthForm from '@/components/AuthForm';
import { login } from '../actions';

export default function LoginPage() {
  return (
    <div className="narrow">
      <AuthForm action={login} mode="login" />
      <p>
        New here? <Link href="/signup">Sign up</Link>
      </p>
    </div>
  );
}
