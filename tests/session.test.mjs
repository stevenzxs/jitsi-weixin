import test from 'node:test';
import assert from 'node:assert/strict';
import { Session } from '../src/session.mjs';

function fixture() {
  const log = { disposed: 0, options: null, events: {} };
  class API {
    constructor(host, options) { log.host = host; log.options = options; }
    addEventListener(name, fn) { log.events[name] = fn; }
    dispose() { log.disposed++; }
  }
  return { log, session: new Session(API, 'https://118.193.36.35:8443', {}) };
}
test('does nothing before explicit join and rejects empty names', () => {
  const { session, log } = fixture();
  assert.equal(log.options, null);
  assert.throws(() => session.join({ room: '855851964', name: ' ' }));
});
test('joins exact room muted according to explicit user choices', () => {
  const { session, log } = fixture();
  session.join({ room: '855851964', name: '访客', audio: true, video: false });
  assert.equal(log.host, '118.193.36.35:8443');
  assert.equal(log.options.roomName, '855851964');
  assert.equal(log.options.configOverwrite.startWithAudioMuted, false);
  assert.equal(log.options.configOverwrite.startWithVideoMuted, true);
  assert.throws(() => session.join({ room: '855851964', name: '访客' }));
  session.dispose(); session.dispose();
  assert.equal(log.disposed, 1);
});
test('forwards events, errors, and releases meeting on readyToClose', () => {
  const { session, log } = fixture();
  let joined = false; let closed = false; let error;
  session.join({ room: '855851964', name: '访客', onJoined: () => joined = true, onClose: () => closed = true, onError: e => error = e });
  log.events.videoConferenceJoined();
  log.events.errorOccurred({ name: 'test' });
  assert.equal(joined, true); assert.equal(error.name, 'test');
  log.events.readyToClose();
  assert.equal(closed, true); assert.equal(log.disposed, 1);
});
