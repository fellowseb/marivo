import { SignIn } from '@clerk/react-router';

function Login() {
  return <SignIn signUpUrl="/signup" />;
}

export default Login;
