import { parseInvite, validateConfig, environment, mediaError } from './core.mjs';
import { Session } from './session.mjs';

const $ = id => document.getElementById(id);
let config, session, busy = false, scriptPromise;
const support = environment({ secure: window.isSecureContext, capture: !!navigator.mediaDevices?.getUserMedia, peer: !!window.RTCPeerConnection });
const ua = navigator.userAgent;
$('client-label').textContent = /wxwork/i.test(ua) ? '企业微信访问' : /MicroMessenger/i.test(ua) ? '微信访问' : '浏览器访问';

function status(message, error = false) {
  $('status').textContent = message;
  $('status-dot').classList.toggle('error', error);
}

function loadAPI() {
  if (window.JitsiMeetExternalAPI) return Promise.resolve(window.JitsiMeetExternalAPI);
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const timer = setTimeout(() => fail(), 15000);
    function fail() { clearTimeout(timer); script.remove(); scriptPromise = null; reject(new Error('会议组件加载失败。请检查服务地址、可信 HTTPS 和网络后重试。')); }
    script.src = `${config.jitsiOrigin}/external_api.js`;
    script.referrerPolicy = 'no-referrer';
    script.onload = () => {
      if (!window.JitsiMeetExternalAPI) return fail();
      clearTimeout(timer); resolve(window.JitsiMeetExternalAPI);
    };
    script.onerror = fail;
    document.head.append(script);
  });
  return scriptPromise;
}

function leave() {
  session?.dispose(); session = null;
  $('frame').replaceChildren();
  $('meeting').hidden = true;
  $('lobby').hidden = false;
  $('footer').hidden = false;
  $('join').disabled = !config || !support.supported;
  status('已退出会议，设备由会议组件释放。');
  $('join').focus();
}

try {
  const invite = parseInvite(location.search);
  $('room').value = invite.room;
  if (invite.subject) $('meeting-title').textContent = invite.subject;
  const response = await fetch('./runtime-config.json', { cache: 'no-store', credentials: 'same-origin' });
  if (!response.ok) throw new Error('尚未配置会议入口，请由管理员提供 runtime-config.json。');
  config = validateConfig(await response.json());
  status(support.message, !support.supported);
  $('join').disabled = !support.supported;
} catch (error) {
  status(error.message, true);
}

$('join-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (busy || !config || !support.supported) return;
  busy = true; $('join').disabled = true;
  try {
    const room = $('room').value;
    const name = $('name').value.trim();
    if (!room || !name) throw new Error('请填写会议号和昵称。');
    parseInvite(new URLSearchParams({ room }));
    status('正在加载会议组件…');
    const API = await loadAPI();
    $('lobby').hidden = true; $('footer').hidden = true; $('meeting').hidden = false;
    $('meeting-error').hidden = true;
    $('meeting-state').textContent = '请在会议准备页确认设备并加入';
    session = new Session(API, config.jitsiOrigin, $('frame'));
    session.join({ room, name, audio: $('audio').checked, video: $('video').checked,
      onJoined: () => { $('meeting-state').textContent = `会议中 · ${room}`; },
      onClose: leave,
      onError: error => { $('meeting-error').textContent = mediaError(error?.name ?? error?.type ?? ''); $('meeting-error').hidden = false; }
    });
  } catch (error) {
    leave(); status(error.message, true);
  } finally {
    busy = false;
    if ($('meeting').hidden) $('join').disabled = !config || !support.supported;
  }
});
$('leave').addEventListener('click', leave);
window.addEventListener('pagehide', () => session?.dispose());
$('copy').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(location.href); $('copy').textContent = '链接已复制'; }
  catch { $('copy').textContent = '无法自动复制，请长按地址栏复制链接'; }
});
