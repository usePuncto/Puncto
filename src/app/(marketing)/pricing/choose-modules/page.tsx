import { redirect } from 'next/navigation';

/** Plan/module picker retired — commercial flow now goes through free diagnosis. */
export default function ChooseModulesPage() {
  redirect('/demo');
}
