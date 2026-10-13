'use client';

import { OrganisationHeader } from '@/components/layout/OrganisationHeader';
import { Button } from '@/components/ui/Button';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { performLogout } from '@/features/auth/logout';
import { refreshMeThunk, selectUser } from '@/features/auth/store/authSlice';
import { organisationKindFor, ORGANISATION_ROUTE, type OrganisationKind } from '@/lib/organisationKind';
import { resolveOrganisationKind } from '@/lib/resolveOrganisationKind';
import { clearOrganisationIntent } from '@/lib/organisationIntent';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getMyOrganisation, type Organisation } from '../api/organisationApi';
import { buildInitialOrganisationValues } from '../lib/defaults';
import { backendMessageOf, knownFailureOf } from '../lib/errors';
import { OrganisationRegistrationForm } from './OrganisationRegistrationForm';
import { OrganisationStatusCard } from './OrganisationStatusCard';

type PageState =
  | { phase: 'loading' }
  | { phase: 'error'; message: string }
  | { phase: 'register' }
  | { phase: 'registered'; organisation: Organisation };

/**
 * An NGO's or FPO's onboarding screen. Registers the organisation if the
 * signed-in user has none yet ("Complete Registration"), otherwise shows where
 * its registration stands. One component for both kinds — the form is the same
 * and only `kind`'s organisation type, entity types and route differ — so the
 * two routes (`/ngo`, `/fpo`) are thin pages around this.
 */
export function OrganisationPage({ kind }: { kind: OrganisationKind }) {
  const t = useTranslations('organisation');
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const [state, setState] = useState<PageState>({ phase: 'loading' });

  // A representative who opens the other kind's URL is sent to their own — the
  // route guard in proxy.ts only sees roles, so it cannot tell NGO from FPO.
  // A user with no organisation type at all (a farmer who typed the URL) stays:
  // choosing to register an organisation is theirs to do.
  useEffect(() => {
    const own = resolveOrganisationKind(user);
    if (own && own !== kind) router.replace(ORGANISATION_ROUTE[own]);
  }, [user, kind, router]);

  const load = useCallback(async () => {
    try {
      const organisation = await getMyOrganisation();
      // The organisation on record settles it, over what the URL says.
      const recordedKind = organisationKindFor(organisation?.orgType);
      if (organisation && recordedKind && recordedKind !== kind) {
        router.replace(ORGANISATION_ROUTE[recordedKind]);
        return;
      }
      setState(organisation ? { phase: 'registered', organisation } : { phase: 'register' });
    } catch (error) {
      const known = knownFailureOf(error);
      setState({ phase: 'error', message: known ? t(`errors.${known}`) : (backendMessageOf(error) ?? t('errors.generic')) });
    }
  }, [kind, router, t]);

  // Loads the organisation on mount. `load` only sets state after its fetch resolves, not synchronously.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const retry = () => {
    setState({ phase: 'loading' });
    void load();
  };

  const initialValues = useMemo(() => buildInitialOrganisationValues(user), [user]);

  // Registered: re-read the signed-in profile first, so Submit Grievance — which pre-fills
  // from it — sees the organisation (its name, registration number, status and whether it
  // may file) rather than the account as it was before registering, then go there.
  const handleRegistered = async (organisation: Organisation) => {
    setState({ phase: 'registered', organisation });
    await dispatch(refreshMeThunk());
    router.push('/submit-grievance');
  };

  const handleBackToSignIn = async () => {
    // Signing out leaves the sign-up intent note alone (see organisationIntent.ts), so an
    // unfinished registration is still waiting here at the next sign-in.
    await performLogout(dispatch, user?.email ?? null);
    router.push('/login');
  };

  // Once the organisation exists the backend reports the account as an NGO / FPO itself,
  // so the browser's note of the sign-up choice has done its job.
  const registeredEmail = state.phase === 'registered' ? user?.email : undefined;
  useEffect(() => {
    if (registeredEmail) clearOrganisationIntent(registeredEmail);
  }, [registeredEmail]);

  const title = state.phase === 'registered' ? t('header.registered') : t('header.completeRegistration');

  return (
    <>
      <OrganisationHeader title={title} />
      <main className="flex-1 overflow-y-auto px-4 py-8 sm:px-6">
        <div className="mx-auto w-full max-w-[960px] space-y-6">
          <button
            type="button"
            onClick={handleBackToSignIn}
            className="inline-flex items-center gap-2 text-[14px] font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            {t('actions.backToSignIn')}
          </button>

          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <p className="text-[12px] font-bold text-gray-600">{t('intro.eyebrow')}</p>
            <h2 className="mt-2 text-2xl font-extrabold text-[#1e293b] tracking-tight">{t(`intro.heading.${kind}`)}</h2>
            <p className="mt-2 text-[14px] text-gray-600 font-medium">{t('intro.body')}</p>
          </section>

          {state.phase === 'loading' && (
            <p role="status" className="py-10 text-center text-sm font-semibold text-gray-500">
              {t('loading')}
            </p>
          )}

          {state.phase === 'error' && (
            <div className="space-y-4">
              <ErrorAlert>{state.message}</ErrorAlert>
              <Button type="button" variant="outline" onClick={retry}>
                {t('actions.retry')}
              </Button>
            </div>
          )}

          {state.phase === 'register' && (
            <OrganisationRegistrationForm
              kind={kind}
              initialValues={initialValues}
              onRegistered={handleRegistered}
              onBackToSignIn={handleBackToSignIn}
            />
          )}

          {state.phase === 'registered' && <OrganisationStatusCard organisation={state.organisation} />}
        </div>
      </main>
    </>
  );
}
