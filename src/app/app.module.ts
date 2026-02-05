import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ParticipantsComponentComponent } from './participants-component/participants-component.component';
import { HttpClientModule } from '@angular/common/http';
import { LoginComponent } from './login/login.component';
import { OKTA_CONFIG, OktaAuthModule } from '@okta/okta-angular';
import { oktaConfig } from './okta.config';
import { FormsModule } from '@angular/forms';



@NgModule({
  declarations: [
    AppComponent,
    ParticipantsComponentComponent,
    LoginComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    AppRoutingModule,
    HttpClientModule  ,
    OktaAuthModule
  ],
  providers: [
  { provide: OKTA_CONFIG, useValue: oktaConfig }
]
,
  bootstrap: [AppComponent]
})
export class AppModule { }
