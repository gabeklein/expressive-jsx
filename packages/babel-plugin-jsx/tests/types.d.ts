declare const transform: {
  (name: string, code: string): void;
  only: (name: string, code: string) => void;
  skip: (name: string, code: string) => void;
};