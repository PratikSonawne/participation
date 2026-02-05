import { Component, Inject, OnInit } from '@angular/core';
import { OKTA_AUTH } from '@okta/okta-angular';
import { OktaAuth, IDToken } from '@okta/okta-auth-js';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {

  emailInput = '';
  passwordInput = '';

  loggedIn = false;
  hasPassword = true;

  oktaUserId?: string;
  email?: string;
  provider?: string;

  constructor(
    @Inject(OKTA_AUTH) private oktaAuth: OktaAuth,
    private http: HttpClient
  ) {}

  async ngOnInit() {
    await this.loadUser();
  }

  // 🔹 EMAIL + PASSWORD LOGIN
  async loginWithEmail() {
    const transaction = await this.oktaAuth.signInWithCredentials({
      username: this.emailInput,
      password: this.passwordInput
    });

    if (transaction.status === 'SUCCESS') {
      await this.oktaAuth.signInWithRedirect({
        sessionToken: transaction.sessionToken
      });
    }
  }

  // 🔹 GOOGLE LOGIN / REGISTER
  loginWithGoogle() {
    this.oktaAuth.signInWithRedirect();
  }

  // 🔹 LOAD USER DETAILS AFTER LOGIN
  async loadUser() {
   
    const tokens = await this.oktaAuth.tokenManager.getTokens();

    if (tokens.idToken) {
      const idToken = tokens.idToken as IDToken;

      this.loggedIn = true;
      this.oktaUserId = idToken.claims.sub;
      this.email = idToken.claims.email;

      // If idp exists → social login
      this.provider = idToken.claims.idp ? 'GOOGLE' : 'OKTA';

      // Google users usually don't have password
      this.hasPassword = !idToken.claims.idp;
    }
     this.checkPasswordStatus();
  }

  // 🔹 REDIRECT TO OKTA RESET PASSWORD FLOW
  redirectToSetPassword() {
    this.http.post<any>(
      `http://localhost:9999/api/okta/reset-password?oktaUserId=${this.oktaUserId}`,
      {}
    ).subscribe(res => {
      if (res && res.resetPasswordUrl) {
        window.location.href = res.resetPasswordUrl;
      }
    });
  }

  async logout() {
    await this.oktaAuth.signOut();
    this.loggedIn = false;
  }

checkPasswordStatus() {
  this.http.get<any>(
    `http://localhost:9999/api/okta/has-password?oktaUserId=${this.oktaUserId}`
  ).subscribe(res => {
    this.hasPassword = res.hasPassword;
  });
}
}