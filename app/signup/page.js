import Link from 'next/link';
import AuthForm from '@/components/AuthForm';
import { signup } from '../actions';

export default function SignupPage() {
  return (
    <div className="narrow">
      <AuthForm action={signup} mode="signup" />
      <p>
        Already a member? <Link href="/login">Log in</Link>
      </p>
    </div>
  );
}
