/**
 * A very simple XML serializer
 */
export class XmlSerializer {
  private readonly push: (data: string) => void;

  private readonly stack: string[] = [];

  public constructor(push: (data: string) => void) {
    this.push = push;
    this.push(`<?xml version="1.0" encoding="UTF-8"?>\n`);
  }

  /**
     *
     * @param name should be a valid XML tag name
     * @param attributes keys should be valid attribute names
     */
  public open(name: string, attributes?: Record<string, string>): void {
    this.push(`${this.identation() + this.formatTag(name, attributes, 'open')}\n`);
    this.stack.push(name);
  }

  public close(): void {
    const name = this.stack.pop();
    if (name === undefined) {
      throw new Error('There is no tag left to close');
    }
    this.push(`${this.identation() + this.formatTag(name, {}, 'close')}\n`);
  }

  public add(node: IXmlNode): void {
    this.push(this.serializeNode(node));
  }

  private serializeNode(node: IXmlNode): string {
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
    name: string, attributes: Record<string, string> | undefined, state: 'open' | 'close' | 'self-closing',
  ): string {
    return `<${state === 'close' ? '/' : ''}${name}${Object.entries(attributes || {}).map(attr => ` ${attr[0]}="${this.escape(attr[1])}"`)}${state === 'self-closing' ? '/' : ''}>`;
  }

  private escape(text: string): string {
    return text.replace(/["&'<>]/gu, (char: '"' | '&' | '\'' | '<' | '>') => {
      switch (char) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
      }
    });
  }
}

export interface IXmlNode {
  name: string;
  attributes?: Record<string, string>;
  children?: (IXmlNode[]) | string;
}
