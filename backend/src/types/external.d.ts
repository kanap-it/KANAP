declare module 'csv-parse/sync' {
  import { ParserOptions } from 'csv-parse';
  export function parse<T = any>(input: string | Buffer, options?: ParserOptions): T[];
}

declare module 'adm-zip';
