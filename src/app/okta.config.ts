import { OktaAuth } from '@okta/okta-auth-js';

export const oktaConfig = {
  oktaAuth: new OktaAuth({
    issuer: 'https://integrator-1142334.okta.com',
  clientId: '0oazo6j2daL3M4Sby697',
    redirectUri: window.location.origin + '/login/callback',
    scopes: ['openid', 'profile', 'email']
  })
};