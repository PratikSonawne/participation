import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { OktaCallbackComponent } from '@okta/okta-angular';
import { LoginComponent } from './login/login.component';
import { ParticipantsComponentComponent } from './participants-component/participants-component.component';

const routes: Routes = [
  { path: 'login', component: ParticipantsComponentComponent },

  // 🔥 THIS IS REQUIRED
  { path: 'login/callback', component: OktaCallbackComponent },

  // default route
  { path: '', redirectTo: 'login', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
