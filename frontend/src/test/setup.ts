import '@testing-library/jest-dom';

// React 18 uses this flag to decide whether async state updates should be
// validated under act() in the current test environment.
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
