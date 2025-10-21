declare module "mailparser" {
  import { Readable } from "stream";

  export interface AddressObject {
    value?: { address?: string }[];
    text?: string;
  }

  export interface ParsedMail {
    messageId?: string;
    subject?: string;
    text?: string;
    html?: string;
    date?: Date;
    from?: AddressObject;
    to?: { value?: { address?: string }[] };
  }

  export function simpleParser(
    source: Buffer | string | Readable
  ): Promise<ParsedMail>;
}
