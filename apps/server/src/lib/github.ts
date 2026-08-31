import { ConfigService } from '../config/config.service';

export function verify(query: any, domain: string) {
  const verifyReq = {
    client_id: ConfigService.get('github')?.clientId,
    client_secret: ConfigService.get('github')?.clientSecret,
    code: query['code'],
    redirect_uri: `https://${domain}/api/login/github`,
  };
  return fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(verifyReq),
  })
    .then((res) => res.json())
    .then((data) => {
      return data.access_token as string;
    });
}

interface IUser {
  id: string;
  name: string;
  login: string;
  avatar_url: string;
}

export function getUserInfo(access_token: string) {
  return fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${access_token}`,
      Accept: 'application/vnd.github+json',
    },
  })
    .then((res) => res.json())
    .then((data) => {
      return data as IUser;
    });
}

export function getAuthUrl(domain: string) {
  const clientId = ConfigService.get('github')?.clientId;
  const redirectUri = `https://${domain}/#/login/github`;
  return `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user:email`;
}
