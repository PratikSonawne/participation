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
    await this.initZoom();
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

  async initZoom() {
    try {
      this.log('Initializing Zoom SDK...', 'info');

      await zoomSdk.config({
        capabilities: [
          'getUserContext',
          'openUrl'
        ]
      });

      this.sdkReady = true;
      this.log('Zoom SDK READY', 'success');

    } catch (error: any) {
      this.log('Zoom SDK Init Failed: ' + error.message, 'error');
    }
  }

  /* ================= INSTALL ================= */

  async install() {

    if (!this.sdkReady) {
      this.log('SDK not ready', 'error');
      return;
    }

    try {
      this.log('Opening OAuth authorization...', 'info');

      await zoomSdk.openUrl({
        url: `${this.backendBaseUrl}/api/zoom/install`
      });

      this.log('OAuth page opened', 'success');

    } catch (error: any) {
      this.log('OAuth openUrl failed: ' + error.message, 'error');
    }
  }

  /* ================= LOAD MEETINGS ================= */

  async loadMeetings() {

    if (!this.sdkReady) {
      this.log('SDK not ready', 'error');
      return;
    }

    this.loading = true;
    this.meetings = [];

    try {
      this.log('Getting user context...', 'info');

      const context: any = await zoomSdk.getUserContext();

      if (!context || !context.uid) {
        throw new Error('User UID not found from Zoom context');
      }

      const userId = context.uid;

      this.log('Zoom UID: ' + userId, 'success');

      const url = `${this.backendBaseUrl}/api/zoom/meetings/${userId}`;

      this.log('Calling backend API...', 'api');

      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data?.body?.meetings?.length > 0) {
        this.meetings = data.body.meetings;
        this.log(`Meetings loaded (${this.meetings.length})`, 'success');
      } else {
        this.log('No meetings found', 'info');
      }

    } catch (error: any) {
      this.log('Load Meetings Failed: ' + error.message, 'error');
    }

    this.loading = false;
  }
}
