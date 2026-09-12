import { ConfigService } from '../config/config.service';

export function verify(query: any) {
  const signeds = query['openid.signed']?.toString().split(',') || [];
  const openVerify = new FormData();
  openVerify.append('openid.ns', 'http://specs.openid.net/auth/2.0');
  openVerify.append('openid.mode', 'check_authentication');
  openVerify.append('openid.sig', query[`openid.sig`] as string);
  for (const key of signeds) {
    openVerify.append(`openid.${key}`, query[`openid.${key}`] as string);
  }
  const url = `${ConfigService.get('steam')?.mirror || 'https://steamcommunity.com'}/openid/login`;
  return fetch(url, {
    method: 'POST',
    body: openVerify,
  })
    .then((res) => res.text())
    .then((text) => {
      if (text.includes('is_valid:true')) {
        const claimed_id = query['openid.claimed_id'] as string;
        return claimed_id.split('/').pop();
      }
      return null;
    });
}

export interface ISteamUser {
  steamid: string;
  personaname: string;
  profileurl: string;
  avatar: string;
  avatarmedium: string;
  avatarfull: string;
  timecreated: number;
}

export function getUserInfo(steamid: string) {
  const steamCfg = ConfigService.get('steam');
  const url = `${steamCfg?.mirror || 'https://api.steampowered.com'}/ISteamUser/GetPlayerSummaries/v2/?key=${steamCfg?.apiKey}&steamids=${steamid}`;
  return fetch(url)
    .then((res) => res.json())
    .then((data) => {
      return data.response.players[0] as ISteamUser;
    });
}

export function getAuthUrl(domain: string) {
  const redirectUri = `https://${domain}/#/login/steam`;
  const realm = `https://${domain}`;
  return `https://steamcommunity.com/openid/login?openid.ns=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0&openid.mode=checkid_setup&openid.return_to=${encodeURIComponent(
    redirectUri,
  )}&openid.realm=${encodeURIComponent(
    realm,
  )}&openid.claimed_id=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.identity=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select`;
}
