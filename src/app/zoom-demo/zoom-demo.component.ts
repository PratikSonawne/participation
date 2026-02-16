import { Component, OnInit } from '@angular/core';
import zoomSdk from '@zoom/appssdk';

interface ZoomMeeting {
  id: string;
  topic: string;
  start_time: string;
  join_url: string;
}

@Component({
  selector: 'app-zoom-demo',
  templateUrl: './zoom-demo.component.html',
  styleUrls: ['./zoom-demo.component.css']
})
export class ZoomDemoComponent implements OnInit {

  meetings: ZoomMeeting[] = [];
  logs: { message: string; type: string }[] = [];

  loading = false;
  sdkReady = false;

  backendBaseUrl = 'https://debate-resistant-logged-barry.trycloudflare.com';

  async ngOnInit() {
    this.log('Zoom Client App Loaded', 'success');
    await this.initZoomSdk();
  }

  /* ================= LOGGER ================= */

  log(message: string, type: string = 'info') {
    const time = new Date().toLocaleTimeString();
    this.logs.unshift({
      message: `[${time}] ${message}`,
      type
    });
  }

  /* ================= INIT SDK ================= */

  async initZoomSdk() {
    try {
      this.log('Initializing Zoom SDK...', 'info');

      await zoomSdk.config({
        capabilities: [
          'openUrl' // required for OAuth redirect
        ]
      });

      this.sdkReady = true;
      this.log('Zoom SDK READY', 'success');

    } catch (error: any) {
      this.log('Zoom SDK Init Failed: ' + error.message, 'error');
    }
  }

  /* ================= OAUTH INSTALL ================= */

  async install() {

    if (!this.sdkReady) {
      this.log('SDK not ready yet', 'error');
      return;
    }

    try {
      this.log('Opening OAuth authorization page...', 'info');

      await zoomSdk.openUrl({
        url: `${this.backendBaseUrl}/api/zoom/install`
      });

      this.log('OAuth page opened in browser', 'success');

    } catch (error: any) {
      this.log('Failed to open OAuth URL: ' + error.message, 'error');
    }
  }

  /* ================= LOAD MEETINGS ================= */

  async loadMeetings() {

    this.loading = true;
    this.meetings = [];

    try {
      this.log('Calling backend to fetch meetings...', 'api');

      const response = await fetch(
        `${this.backendBaseUrl}/api/zoom/meetings`,
        {
          method: 'GET',
          credentials: 'include', // important if using session
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data && data.length > 0) {
        this.meetings = data;
        this.log(`Meetings loaded successfully (${data.length})`, 'success');
      } else {
        this.log('No meetings found for this user', 'info');
      }

    } catch (error: any) {
      this.log('Load Meetings Failed: ' + error.message, 'error');
    }

    this.loading = false;
  }
}
