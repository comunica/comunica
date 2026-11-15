/**
 * A very simple XML serializer
 */
export class XmlSerializer {
  private readonly stack: string[] = [];

  public static header = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  // Characters to escape, and characters that XML 1.0 does not allow, not even as character references
  private static readonly ESCAPED_CHARACTERS =
    // eslint-disable-next-line no-control-regex
    /["&'<>\u0000-\u0008\u000B\u000C\u000E-\u001F\uD800-\uDFFF\uFFFE\uFFFF]/u;

  private static readonly ESCAPED_CHARACTERS_GLOBAL = new RegExp(XmlSerializer.ESCAPED_CHARACTERS, 'gu');

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
    return '  '.repeat(this.stack.length);
  }

  private formatTag(
    name: string,
    attributes: Record<string, string> | undefined,
    state: 'open' | 'close' | 'self-closing',
  ): string {
    let attributesString = '';
    if (attributes) {
      for (const key in attributes) {
        attributesString += ` ${key}="${this.escape(attributes[key])}"`;
      }
    }
    return `<${state === 'close' ? '/' : ''}${name}${attributesString}${state === 'self-closing' ? '/' : ''}>`;
  }

  private escape(text: string): string {
    if (!XmlSerializer.ESCAPED_CHARACTERS.test(text)) {
      return text;
    }
    return text.replaceAll(XmlSerializer.ESCAPED_CHARACTERS_GLOBAL, (char: string) => {
      switch (char) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
        // Characters that XML 1.0 does not allow are replaced, so that the document remains well-formed
        default: return '\uFFFD';
      }
    });
  }
}

export interface IXmlNode {
  name: string;
  attributes?: Record<string, string>;
  children?: (IXmlNode[]) | string;
}
