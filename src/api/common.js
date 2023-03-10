import { promiseGetRecoil } from 'recoil-outside';
import {
  apiHostState,
  appLangState,
  isOnlineState,
  sourceLangState,
  userIDState,
  visitorIDState,
} from '../states/main';

export const getProfile = async () => {
  const apiHost = await promiseGetRecoil(apiHostState);
  const visitorID = await promiseGetRecoil(visitorIDState);
  const appLang = await promiseGetRecoil(appLangState);
  const sourceLang = await promiseGetRecoil(sourceLangState);
  const isOnline = await promiseGetRecoil(isOnlineState);
  const userID = await promiseGetRecoil(userIDState);

  return { apiHost, appLang, visitorID, sourceLang, isOnline, userID };
};
