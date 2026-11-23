import test from 'node:test';
import assert from 'node:assert/strict';
import { parseInvite, validateConfig, environment, mediaError } from '../src/core.mjs';

test('accepts exact meeting and decoded subject', () => {
  assert.deepEqual(parseInvite('?room=855851964&subject=我的会议'), { room: '855851964', subject: '我的会议' });
});
test('rejects malformed and duplicated room rather than silently sanitizing', () => {
  for (const query of ['?room=855-851-964', '?room=8558519640', '?room=abc855851964', '?room=855851964&room=123456789', '?room=012345678']) {
    assert.throws(() => parseInvite(query));
  }
});
test('allows empty invite to show editable form and limits subject', () => {
  assert.equal(parseInvite('').room, '');
  assert.throws(() => parseInvite('?room=855851964&subject=' + 'a'.repeat(121)));
});
test('requires explicit HTTPS origin without credentials query or paths', () => {
  assert.equal(validateConfig({ jitsiOrigin: 'https://118.193.36.35:8443' }).jitsiOrigin, 'https://118.193.36.35:8443');
  for (const value of ['http://example.com', 'https://u:p@example.com', 'https://example.com/path', 'https://example.com?x=1', 'https://example.com#x']) {
    assert.throws(() => validateConfig({ jitsiOrigin: value }));
  }
});
test('does not infer microphone permission or certificate trust from API presence', () => {
  assert.equal(environment({ secure: true, capture: true, peer: true }).supported, true);
  assert.equal(environment({ secure: false, capture: true, peer: true }).supported, false);
  assert.equal(environment({ secure: true, capture: false, peer: true }).supported, false);
});
test('permission and hardware failures have actionable messages', () => {
  assert.match(mediaError('NotAllowedError'), /权限/);
  assert.match(mediaError('NotFoundError'), /设备/);
  assert.match(mediaError('OTHER'), /浏览器/);
});
