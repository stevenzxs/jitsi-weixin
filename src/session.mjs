import { parseInvite, validateConfig } from './core.mjs';

export class Session {
  constructor(API, origin, parentNode) {
    this.API = API;
    this.origin = validateConfig({ jitsiOrigin: origin }).jitsiOrigin;
    this.parentNode = parentNode;
    this.api = null;
  }

  join({ room, name, audio = false, video = false, onJoined, onClose, onError }) {
    if (this.api) throw new Error('已有会议连接，请先退出。');
    if (!room || !name?.trim() || name.trim().length > 40) throw new Error('请填写九位会议号和 1–40 字的昵称。');
    parseInvite(new URLSearchParams({ room }));
    this.api = new this.API(new URL(this.origin).host, {
      roomName: room,
      parentNode: this.parentNode,
      width: '100%', height: '100%',
      userInfo: { displayName: name.trim() },
      lang: 'zhCN',
      configOverwrite: {
        prejoinConfig: { enabled: true },
        startWithAudioMuted: !audio,
        startWithVideoMuted: !video,
        disableDeepLinking: true,
        deeplinking: { disabled: true }
      }
    });
    const current = this.api;
    const listen = (name, callback) => current.addEventListener(name, event => {
      if (this.api === current) callback(event);
    });
    listen('videoConferenceJoined', () => onJoined?.());
    listen('errorOccurred', event => onError?.(event));
    listen('cameraError', event => onError?.(event));
    listen('micError', event => onError?.(event));
    listen('readyToClose', () => { this.dispose(); onClose?.(); });
  }

  dispose() {
    const api = this.api;
    this.api = null;
    api?.dispose();
  }
}
