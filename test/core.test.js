import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createStateMachine } from '../src/index.js';

describe('createStateMachine', () => {
  const trafficLight = () => ({
    initial: 'green',
    transitions: {
      green: { warn: 'yellow' },
      yellow: { proceed: 'green', panic: 'red' },
      red: { recover: 'green' },
    },
  });

  it('starts in the initial state', () => {
    const fsm = createStateMachine(trafficLight());
    assert.equal(fsm.getState(), 'green');
  });

  it('moves to the target state on an allowed action', () => {
    const fsm = createStateMachine(trafficLight());
    assert.equal(fsm.send('warn'), 'yellow');
    assert.equal(fsm.getState(), 'yellow');
  });

  it('returns true from can() for an allowed action', () => {
    const fsm = createStateMachine(trafficLight());
    assert.equal(fsm.can('warn'), true);
  });

  it('returns false from can() for a disallowed action', () => {
    const fsm = createStateMachine(trafficLight());
    assert.equal(fsm.can('recover'), false);
  });

  it('throws on send() for a disallowed action and leaves state unchanged', () => {
    const fsm = createStateMachine(trafficLight());
    assert.throws(
      () => fsm.send('recover'),
      /action 'recover' is not allowed in state 'green'/,
    );
    assert.equal(fsm.getState(), 'green');
  });

  it('returns false from can() for an unknown action rather than throwing', () => {
    const fsm = createStateMachine(trafficLight());
    assert.equal(fsm.can('teleport'), false);
  });

  it('supports multiple consecutive transitions', () => {
    const fsm = createStateMachine(trafficLight());
    fsm.send('warn');
    fsm.send('panic');
    assert.equal(fsm.getState(), 'red');
    fsm.send('recover');
    assert.equal(fsm.getState(), 'green');
  });

  it('reports the current state via is()', () => {
    const fsm = createStateMachine(trafficLight());
    assert.equal(fsm.is('green'), true);
    assert.equal(fsm.is('red'), false);
  });

  it('throws when the initial state is not in transitions', () => {
    assert.throws(
      () => createStateMachine({
        initial: 'blue',
        transitions: { green: { warn: 'yellow' }, yellow: { panic: 'green' } },
      }),
      /initial state 'blue' is not defined in transitions/,
    );
  });

  it('throws when a transition targets an unknown state', () => {
    assert.throws(
      () => createStateMachine({
        initial: 'green',
        transitions: { green: { warn: 'purple' } },
      }),
      /targets unknown state 'purple'/,
    );
  });

  it('throws when a transition target is not a string', () => {
    assert.throws(
      () => createStateMachine({
        initial: 'green',
        transitions: { green: { warn: 42 }, yellow: {} },
      }),
      /must be a non-empty string/,
    );
  });

  it('rejects a definition that is not an object', () => {
    assert.throws(
      () => createStateMachine(null),
      /definition must be an object/,
    );
  });

  it('rejects an empty action passed to send()', () => {
    const fsm = createStateMachine(trafficLight());
    assert.throws(
      () => fsm.send(''),
      /action must be a non-empty string/,
    );
  });

  it('handles a state with no outbound transitions (terminal state)', () => {
    const fsm = createStateMachine({
      initial: 'open',
      transitions: {
        open: { close: 'closed' },
        closed: {},
      },
    });
    assert.equal(fsm.can('close'), true);
    fsm.send('close');
    assert.equal(fsm.getState(), 'closed');
    assert.equal(fsm.can('close'), false);
    assert.throws(
      () => fsm.send('close'),
      /action 'close' is not allowed in state 'closed'/,
    );
  });
});
