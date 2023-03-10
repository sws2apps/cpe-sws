import { lazy, useEffect } from 'react';
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';
import useFirebaseAuth from '../../../hooks/useFirebaseAuth';
import { loadApp } from '../../../utils/app';
import { runUpdater } from '../../../utils/updater';
import {
  currentMFAStageState,
  isAppLoadState,
  isAuthProcessingState,
  isCongAccountCreateState,
  isEmailAuthState,
  isEmailBlockedState,
  isEmailNotVerifiedState,
  isOnlineState,
  isSetupState,
  isShowTermsUseState,
  isUserEmailOTPState,
  isUserMfaSetupState,
  isUserMfaVerifyState,
  isUserSignInState,
  isUserSignUpState,
  offlineOverrideState,
  visitorIDState,
} from '../../../states/main';
import { apiSendAuthorization } from '../../../api';
import { dbGetAppSettings, dbUpdateAppSettings } from '../../../indexedDb/dbAppSettings';
import WaitingPage from '../../../components/WaitingPage';
import SetupMFA from './SetupMFA';
import VerifyMFA from './VerifyMFA';
import { appMessageState, appSeverityState, appSnackOpenState } from '../../../states/notification';

// lazy loading
const EmailNotVerified = lazy(() => import('./EmailNotVerified'));
const SignIn = lazy(() => import('./SignIn'));
const SignUp = lazy(() => import('./SignUp'));
const EmailAuth = lazy(() => import('./EmailAuth'));
const EmailBlocked = lazy(() => import('./EmailBlocked'));
const CongregationCreate = lazy(() => import('./CongregationCreate'));
const TermsUse = lazy(() => import('./TermsUse'));
const EmailOTP = lazy(() => import('./EmailOTP'));

const VipStartup = () => {
  const { isAuthenticated } = useFirebaseAuth();

  const [isUserSignUp, setIsUserSignUp] = useRecoilState(isUserSignUpState);
  const [isUserSignIn, setIsUserSignIn] = useRecoilState(isUserSignInState);
  const [isUserMfaVerify, setUserMfaVerify] = useRecoilState(isUserMfaVerifyState);
  const [isUserMfaSetup, setUserMfaSetup] = useRecoilState(isUserMfaSetupState);
  const [isUserEmailOTP, setUserEmailOTP] = useRecoilState(isUserEmailOTPState);
  const [isCongAccountCreate, setIsCongAccountCreate] = useRecoilState(isCongAccountCreateState);
  const [isAuthProcessing, setIsAuthProcessing] = useRecoilState(isAuthProcessingState);

  const setIsAppLoad = useSetRecoilState(isAppLoadState);
  const setIsSetup = useSetRecoilState(isSetupState);
  const setAppSnackOpen = useSetRecoilState(appSnackOpenState);
  const setAppSeverity = useSetRecoilState(appSeverityState);
  const setAppMessage = useSetRecoilState(appMessageState);
  const setCurrentMFAStage = useSetRecoilState(currentMFAStageState);

  const showTermsUse = useRecoilValue(isShowTermsUseState);
  const isEmailNotVerified = useRecoilValue(isEmailNotVerifiedState);
  const isEmailBlocked = useRecoilValue(isEmailBlockedState);
  const isEmailAuth = useRecoilValue(isEmailAuthState);
  const isOnline = useRecoilValue(isOnlineState);
  const isOfflineOverride = useRecoilValue(offlineOverrideState);
  const visitorID = useRecoilValue(visitorIDState);

  useEffect(() => {
    if (showTermsUse) return;

    const showSignup = () => {
      setIsUserSignUp(true);
      setIsUserSignIn(false);
      setIsCongAccountCreate(false);
      setUserMfaVerify(false);
      setUserMfaSetup(false);
      setUserEmailOTP(false);
    };

    const runNotAuthenticatedStep = async () => {
      const settings = await dbGetAppSettings();
      const cong_name = settings.cong_name;
      const cong_role = settings.cong_role || [];

      if (isOfflineOverride) {
        showSignup();
        return;
      }

      if (cong_name.length === 0) {
        showSignup();
        return;
      }

      const approvedRole = cong_role.includes('lmmo') || cong_role.includes('lmmo-backup');

      if (!approvedRole) {
        showSignup();
        return;
      }

      if (cong_name.length > 0) {
        setIsSetup(false);
        await loadApp();
        await runUpdater();
        setTimeout(() => {
          setIsSetup(false);
          setIsAppLoad(false);
        }, [1000]);
      }
    };

    if (!isAuthenticated) runNotAuthenticatedStep();
  }, [
    isAuthenticated,
    isOfflineOverride,
    isOnline,
    setIsAppLoad,
    setIsCongAccountCreate,
    setIsSetup,
    setIsUserSignIn,
    setIsUserSignUp,
    setUserMfaSetup,
    setUserMfaVerify,
    setUserEmailOTP,
    showTermsUse,
  ]);

  useEffect(() => {
    if (showTermsUse) return;

    const runAuthenticatedStep = async () => {
      try {
        setIsUserSignIn(false);
        setIsAuthProcessing(true);

        const settings = await dbGetAppSettings();
        const cong_name = settings.cong_name || '';
        const cong_role = settings.cong_role || [];

        const approvedRole = cong_role.includes('lmmo') || cong_role.includes('admin');

        if (!isOfflineOverride && cong_name.length > 0 && approvedRole) {
          setIsSetup(false);
          await loadApp();
          await runUpdater();
          setTimeout(() => {
            setIsSetup(false);
            setIsAppLoad(false);
          }, [1000]);
          return;
        }

        setIsAuthProcessing(true);
        const result = await apiSendAuthorization();

        if (result.isSetupMFA || result.isVerifyMFA) {
          if (result.isVerifyMFA) {
            setCurrentMFAStage('verify');
            setIsUserSignUp(false);
            setUserMfaVerify(true);
          }
          if (result.isSetupMFA) {
            setCurrentMFAStage('setup');
            setIsUserSignUp(false);
            setUserMfaSetup(true);
          }
          await dbUpdateAppSettings({ account_type: 'vip' });
        }

        setIsAuthProcessing(false);
      } catch (err) {
        setIsAuthProcessing(false);
        setAppSnackOpen(true);
        setAppSeverity('error');
        setAppMessage(err.message);
      }
    };

    if (isAuthenticated && visitorID !== '') runAuthenticatedStep();
  }, [
    isAuthenticated,
    isOfflineOverride,
    setAppSnackOpen,
    setAppSeverity,
    setAppMessage,
    setIsAppLoad,
    setIsAuthProcessing,
    setIsSetup,
    setIsUserSignIn,
    setIsUserSignUp,
    setUserMfaSetup,
    setUserMfaVerify,
    setIsCongAccountCreate,
    setCurrentMFAStage,
    showTermsUse,
    visitorID,
  ]);

  return (
    <>
      {isAuthProcessing && <WaitingPage />}
      {showTermsUse && <TermsUse />}
      {isUserSignIn && <SignIn />}
      {isUserSignUp && <SignUp />}
      {isUserEmailOTP && <EmailOTP />}
      {isEmailNotVerified && <EmailNotVerified />}
      {isUserMfaSetup && <SetupMFA />}
      {isUserMfaVerify && <VerifyMFA />}
      {isEmailBlocked && <EmailBlocked />}
      {isCongAccountCreate && <CongregationCreate />}
      {isEmailAuth && <EmailAuth />}
    </>
  );
};

export default VipStartup;
