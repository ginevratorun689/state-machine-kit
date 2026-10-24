/**
 * state-machine-kit / core
 *
 * A minimal finite state machine whose only job is to reject transitions
 * that are not explicitly allowed in the current state.
 *
 * Design choices, because they are not obvious from the code alone:
 *
 * 1. States are plain object keys. We never enumerate or validate state
 *    names against a separate set — the keys of `transitions` ARE the
 *    authoritative set. This keeps construction to a single argument and
 *    avoids a second source of truth that could drift.
 *
 * 2. A transition's *target* must itself be a key in `transitions`. This
 *    is checked once at build time so a misconfigured machine fails loud
 *    and early rather than steering into a dead state at runtime.
 *
 * 3. `can` returns false (never throws) for unknown actions. It is meant
 *    for cheap defensive checks in UI code; throwing would force every
 *    caller into a try/catch for a question that has a clean boolean
 *    answer.
 *
 * 4. `send` throws on rejection. The happy path returns the new state so
 *    callers can chain or log it without an extra getter call. Throwing
 *    on the unhappy path makes illegal transitions unmissable during
 *    development; if a caller wants lenient behaviour they check `can`
 *    first.
 */

/**
 * Validates the machine definition and returns a frozen lookup table
 * for runtime use.
 *
 * @param {Record<string, Record<string, string>>} transitions
 * @returns {Readonly<Record<string, Readonly<Record<string, string>>>>}
 */
function buildTransitionTable(transitions) {
  if (transitions === null || typeof transitions !== 'object') {
    throw new TypeError('transitions must be an object');
  }

  const knownStates = new Set(Object.keys(transitions));

  /** @type {Record<string, Record<string, string>} */
  const table = {};

  for (const fromState of knownStates) {
    const actions = transitions[fromState];
    if (actions === null || typeof actions !== 'object') {
      throw new TypeError(
        `transitions['${fromState}'] must be an object mapping actions to target states`,
      );
    }

    /** @type {Record<string, string>} */
    const normalised = {};
    for (const action of Object.keys(actions)) {
      const target = actions[action];
      if (typeof target !== 'string' || target.length === 0) {
        throw new TypeError(
          `transitions['${fromState}']['${action}'] must be a non-empty string`,
        );
      }
      if (!knownStates.has(target)) {
        // A transition into a state that has no outbound rules is almost
        // always a typo or an incomplete definition. Reject at build time
        // so the error points at the configuration, not at a later call.
        throw new Error(
          `transitions['${fromState}']['${action}'] targets unknown state '${target}'`,
        );
      }
      normalised[action] = target;
    }
    table[fromState] = normalised;
  }

  // Freeze so callers cannot mutate the table after construction and
  // silently change the machine's behaviour mid-flight.
  for (const fromState of Object.keys(table)) {
    Object.freeze(table[fromState]);
  }
  return Object.freeze(table);
}

/**
 * Creates a finite state machine.
 *
 * @param {{
 *   initial: string,
 *   transitions: Record<string, Record<string, string>>,
 * }} definition
 * @returns {{
 *   getState: () => string,
 *   can: (action: string) => boolean,
 *   send: (action: string) => string,
 *   is: (state: string) => boolean,
 * }}
 */
export function createStateMachine(definition) {
  if (definition === null || typeof definition !== 'object') {
    throw new TypeError('definition must be an object');
  }
  const { initial, transitions } = definition;

  if (typeof initial !== 'string' || initial.length === 0) {
    throw new TypeError('definition.initial must be a non-empty string');
  }

  // Build first so we know the state set is internally consistent before
  // we check that `initial` belongs to it. This ordering gives a clearer
  // error for a structurally broken definition than checking initial first.
  const table = buildTransitionTable(transitions);

  if (!Object.prototype.hasOwnProperty.call(table, initial)) {
    throw new Error(`initial state '${initial}' is not defined in transitions`);
  }

  let state = initial;

  return {
    /**
     * Returns the machine's current state name.
     * @returns {string}
     */
    getState() {
      return state;
    },

    /**
     * Returns true if `action` is allowed in the current state.
     * Unknown actions return false rather than throwing; see header note.
     * @param {string} action
     * @returns {boolean}
     */
    can(action) {
      if (typeof action !== 'string' || action.length === 0) {
        return false;
      }
      return Object.prototype.hasOwnProperty.call(table[state], action);
    },

    /**
     * Returns true if the machine is currently in `state`.
     * @param {string} targetState
     * @returns {boolean}
     */
    is(targetState) {
      return state === targetState;
    },

    /**
     * Attempts the named action. On success, advances state and returns
     * the new state name. On failure, throws an Error and leaves state
     * untouched — a rejected transition never has side effects.
     * @param {string} action
     * @returns {string} the new state
     */
    send(action) {
      if (typeof action !== 'string' || action.length === 0) {
        throw new TypeError('action must be a non-empty string');
      }
      if (!Object.prototype.hasOwnProperty.call(table[state], action)) {
        throw new Error(
          `action '${action}' is not allowed in state '${state}'`,
        );
      }
      state = table[state][action];
      return state;
    },
  };
}
