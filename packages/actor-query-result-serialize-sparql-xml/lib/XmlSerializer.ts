/**
 * A very simple XML serializer
 */
export class XmlSerializer {
  private readonly stack: string[] = [];

  public static header = `<?xml version="1.0" encoding="UTF-8"?>\n`;

  public constructor() {}

  /**
   *
   * @param name should be a valid XML tag name
   * @param attributes keys should be valid attribute names
   */
  public open(name: string, attributes?: Record<string, string>): string {
    const res = `${this.identation() + this.formatTag(name, attributes, 'open')}\n`;
    this.stack.push(name);
    return res;
  }

  public close(): string {
    const name = this.stack.pop();
    if (name === undefined) {
      throw new Error('There is no tag left to close');
    }
    return `${this.identation() + this.formatTag(name, {}, 'close')}\n`;
  }

  public serializeNode(node: IXmlNode): string {
    if (node.children === undefined) {
      return `${this.identation() + this.formatTag(node.name, node.attributes, 'self-closing')}\n`;
    }
    if (typeof node.children === 'string') {
      return `${this.identation() + this.formatTag(node.name, node.attributes, 'open') + this.escape(node.children) + this.formatTag(node.name, {}, 'close')}\n`;
    }
    const parts = [];
    parts.push(`${this.identation() + this.formatTag(node.name, node.attributes, 'open')}\n`);
    this.stack.push(node.name);
    for (const child of node.children) {
      parts.push(this.serializeNode(child));
    }
    this.stack.pop();
    parts.push(`${this.identation() + this.formatTag(node.name, {}, 'close')}\n`);
    return parts.join('');
  }

  private identation(): string {
    return this.stack.map(_ => '  ').join('');
  }

  private formatTag(
    name: string,
    attributes: Record<string, string> | undefined,
    state: 'open' | 'close' | 'self-closing',
  ): string {
    // eslint-disable-next-line ts/restrict-template-expressions
    return `<${state === 'close' ? '/' : ''}${name}${Object.entries(attributes ?? {}).map(attr => ` ${attr[0]}="${this.escape(attr[1])}"`)}${state === 'self-closing' ? '/' : ''}>`;
  }

  private escape(text: string): string {
    return text.replaceAll(/["&'<>]/gu, <(substring: string) => string> ((char: '"' | '&' | '\'' | '<' | '>') => {
      switch (char) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
      }
    }));
  }
}

export interface IXmlNode {
  name: string;
  attributes?: Record<string, string>;
  children?: (IXmlNode[]) | string;
}
