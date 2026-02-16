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
  logs: { message: string, type: string }[] = [];
  sdkReady = false;
  loading = false;

  ngOnInit() {
    this.log('Zoom App Loaded', 'success');
    this.initZoom();
  }

  /* ---------------- LOGGER ---------------- */

  log(message: string, type: string = 'info') {
    const time = new Date().toLocaleTimeString();
    this.logs.unshift({
      message: `[${time}] ${message}`,
      type
    });
  }

  /* ---------------- INIT SDK ---------------- */

  async initZoom() {
    try {
      this.log('Initializing Zoom SDK...', 'info');

      await zoomSdk.config({
        capabilities: ['getUserContext']
      });

      this.sdkReady = true;
      this.log('Zoom SDK READY', 'success');

    } catch (e: any) {
      this.log('Zoom SDK Init Failed: ' + e.message, 'error');
    }
  }

  /* ---------------- LOAD MEETINGS ---------------- */

  async loadMeetings() {

    if (!this.sdkReady) {
      this.log('Zoom SDK not ready yet', 'error');
      return;
    }

    this.loading = true;
    this.meetings = [];

    try {
      this.log('Getting Zoom user context...', 'info');

      const context: any = await zoomSdk.getUserContext();

const userId = context.userId || context.uid;

this.log('User ID: ' + userId);


      const url =
        `https://debate-resistant-logged-barry.trycloudflare.com/api/zoom/meetings/${context.userId}`;

      this.log('Calling backend API...', 'api');

      const res = await fetch(url);
      const data = await res.json();

      if (data && data.length > 0) {
        this.meetings = data;
        this.log('Meetings loaded successfully (' + data.length + ')', 'success');
      } else {
        this.log('No meetings found', 'info');
      }

    } catch (err: any) {
      this.log('Load Meetings Failed: ' + err.message, 'error');
    }

    this.loading = false;
  }

  /* ---------------- INSTALL ---------------- */

  install() {
    this.log('Redirecting to OAuth install...', 'info');

    window.location.href =
      'https://debate-resistant-logged-barry.trycloudflare.com/api/zoom/install';
  }
}
