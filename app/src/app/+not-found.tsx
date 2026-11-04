import { Redirect } from 'expo-router';

// Any unknown address goes back to My gardens.
export default function NotFound() {
  return <Redirect href="/" />;
}
