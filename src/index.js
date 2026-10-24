/**
 * Public entry point.
 *
 * Only createStateMachine is re-exported so consumers cannot reach into
 * internal helpers and couple themselves to implementation details.
 */
export { createStateMachine } from './core.js';
