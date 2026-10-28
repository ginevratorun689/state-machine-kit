# state-machine-kit

A tiny finite state machine that rejects transitions not allowed in the current state.

```js
import { createStateMachine } from 'state-machine-kit';

const fsm = createStateMachine({
  initial: 'green',
  transitions: {
    green: { warn: 'yellow' },
    yellow: { proceed: 'green', panic: 'red' },
    red: { recover: 'green' },
  },
});

fsm.can('warn');     // true
fsm.send('warn');    // 'yellow'
fsm.getState();      // 'yellow'
fsm.can('panic');    // true
fsm.send('panic');   // 'red'
fsm.send('recover'); // 'green'
```

## Why

Most state machine libraries do too much: history, parallel regions, entry actions, middleware. The actual job — keeping a value out of states it shouldn't reach — gets buried. This library does only that job. A transition is allowed only if the current state has an entry for that action; everything else throws synchronously. The trade-off is that orchestration of side-effects is left to the caller: on transition you get the new state, and you decide what to do with it.

## Edge cases

A transition whose target state is not a key in `transitions` is rejected at construction, so you cannot define a path into nowhere. Unknown actions simply aren't in the lookup table, so `can('nope')` is `false` rather than throwing — the check is cheap and safe to call defensively. `send` returns the new state on success and throws on failure, so callers should wrap accordingly.

## Performance

The window keeps a bounded buffer, so `push` is constant time and memory does not
grow with the length of the stream. `peak` and `trough` are linear in the window
size, which is the trade that keeps `push` cheap.


## License
MIT
