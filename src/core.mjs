export function parseInvite(query) {
  const params = new URLSearchParams(query);
  for (const key of ['room', 'subject']) {
    if (params.getAll(key).length > 1) throw new Error('邀请参数重复，请联系邀请人重新发送链接。');
  }
  const room = params.get('room') ?? '';
  const subject = (params.get('subject') ?? '').trim();
  if (room && !/^[1-9]\d{8}$/.test(room)) throw new Error('会议号必须是首位非零的九位数字。');
  if (subject.length > 120) throw new Error('会议主题不能超过 120 个字符。');
  return { room, subject };
}

export function validateConfig(config) {
  const url = new URL(config.jitsiOrigin);
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('会议服务必须配置为无路径、凭据及查询参数的 HTTPS origin。');
  }
  return { jitsiOrigin: url.origin };
}

export function environment({ secure, capture, peer }) {
  if (!secure) return { supported: false, message: '当前页面不是安全上下文，请使用可信 HTTPS 入口。' };
  if (!capture || !peer) return { supported: false, message: '当前浏览器缺少音视频能力，请在系统浏览器中打开。' };
  return { supported: true, message: '浏览器具备基础音视频接口；设备权限、证书信任与实际通话仍需验证。' };
}

export function mediaError(name) {
  if (/NotAllowed|Permission|permission/i.test(name)) return '未获得摄像头或麦克风权限。请检查微信/浏览器的系统权限，并关闭页面后重试。';
  if (/NotFound|DevicesNotFound/i.test(name)) return '未找到音视频设备，请连接设备或关闭相应媒体后重试。';
  if (/NotReadable|TrackStart/i.test(name)) return '设备可能被其他应用占用，请结束其他通话后重试。';
  return '会议连接未完成，请检查网络或在系统浏览器中打开；也请确认会议允许访客加入。';
}
